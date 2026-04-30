/**
 * DeepSeek AI 服务层
 * 负责与 DeepSeek API 通信，为话术通关系统提供 AI 对话和评分能力
 * 同时支持通义千问VL视觉模型（用于皮肤分析等图片场景）
 */
const https = require('https');

const API_KEY = process.env.DEEPSEEK_API_KEY || '';
const API_BASE = 'api.deepseek.com';
const MODEL = 'deepseek-chat';

// 通义千问 VL 配置
const QWEN_API_KEY = process.env.QWEN_API_KEY || 'sk-7dd97fec3aef4c62a866e7294e167646';
const QWEN_BASE = 'dashscope.aliyuncs.com';

/**
 * 通用 DeepSeek API 调用
 * 三重超时保障: 1)https原生timeout 2)Promise.race硬性超时 3)连接层socket超时
 */
function callDeepSeek(messages, options = {}) {
  if (!API_KEY) {
    return Promise.reject(new Error('DeepSeek API Key 未配置'));
  }

  const TIMEOUT_MS = options.timeout || 25000; // 默认25秒
  const MODEL_NAME = options.model || MODEL;    // 支持覆盖模型(如 deepseek-vl)

  // 内部实际调用函数
  function doRequest() {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: MODEL_NAME,
        messages,
        temperature: options.temperature ?? 0.8,
        max_tokens: options.max_tokens ?? 1024,
        stream: false,
      });

      console.log(`[DeepSeek] 开始请求... 消息数:${messages.length} body长度:${body.length}`);

      const reqOptions = {
        hostname: API_BASE,
        path: '/chat/completions',
        method: 'POST',
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/json',
        },
      };

      const startTime = Date.now();

      const req = https.request(reqOptions, (res) => {
        const elapsed = Date.now() - startTime;
        console.log(`[DeepSeek] 收到响应! 状态码:${res.statusCode} 耗时:${elapsed}ms`);
        
        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              console.error('[DeepSeek] API返回错误:', parsed.error.message);
              reject(new Error(parsed.error.message || 'DeepSeek API 错误'));
            } else {
              const content = parsed.choices?.[0]?.message?.content || '';
              console.log(`[DeepSeek] 成功! 回复长度:${content.length} 总耗时:${Date.now()-startTime}ms`);
              resolve(content);
            }
          } catch (e) {
            console.error('[DeepSeek] 解析响应失败:', e.message, '原始数据前200字:', data.substring(0, 200));
            reject(new Error('解析 DeepSeek 响应失败: ' + e.message));
          }
        });
      });

      // 保障1: 原生超时
      req.on('timeout', () => {
        console.warn(`[DeepSeek] ⚠️ HTTPS请求超时(${TIMEOUT_MS}ms), destroy连接`);
        try { req.destroy(); } catch(e) {}
        reject(new Error('DeepSeek API 请求超时'));
      });

      // 保障2: socket层面超时（防止DNS卡死）
      req.on('socket', (socket) => {
        socket.setTimeout(TIMEOUT_MS + 5000, () => {
          console.warn(`[DeepSeek] ⚠️ Socket级别超时, 强制销毁`);
          try { req.destroy(); } catch(e) {}
          reject(new Error('Socket 连接超时'));
        });
      });

      req.on('error', (err) => {
        console.error('[DeepSeek] ❌ 请求错误:', err.message);
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }

  // 保障3: Promise.race 硬性超时兜底
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`DeepSeek 超时(${TIMEOUT_MS}ms), 触发降级`)), TIMEOUT_MS + 5000)
  );

  return Promise.race([doRequest(), timeoutPromise]);
}

// ==================== 通义千问 VL（视觉模型） ====================

/**
 * 调用通义千问 VL 模型 — 支持图片输入
 * 完全兼容 OpenAI 接口规范，支持多模态（text + image_url）
 *
 * @param {Array} messages - 对话消息，content 支持数组格式 [{type:'text', text:'...'}, {type:'image_url', image_url:{url:'data:...'}}]
 * @param {Object} options - 可选参数 { temperature, max_tokens, model, timeout }
 * @returns {Promise<string>} AI 回复文本
 */
function callQwenVL(messages, options = {}) {
  if (!QWEN_API_KEY) {
    return Promise.reject(new Error('通义千问 API Key 未配置'));
  }

  const TIMEOUT_MS = options.timeout || 60000; // 图片分析默认60秒
  const MODEL_NAME = options.model || 'qwen-vl-max'; // 默认用最强版

  function doRequest() {
    return new Promise((resolve, reject) => {
      const body = JSON.stringify({
        model: MODEL_NAME,
        messages,
        temperature: options.temperature ?? 0.6,
        max_tokens: options.max_tokens ?? 2500,
        stream: false,
      });

      console.log(`[通义VL] 开始请求... 模型:${MODEL_NAME} 消息数:${messages.length} body长度:${body.length}`);

      const reqOptions = {
        hostname: QWEN_BASE,
        path: '/compatible-mode/v1/chat/completions',
        method: 'POST',
        timeout: TIMEOUT_MS,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${QWEN_API_KEY}`,
          'Accept': 'application/json',
        },
      };

      const startTime = Date.now();

      const req = https.request(reqOptions, (res) => {
        const elapsed = Date.now() - startTime;
        console.log(`[通义VL] 收到响应! 状态码:${res.statusCode} 耗时:${elapsed}ms`);

        let data = '';
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              console.error('[通义VL] API返回错误:', JSON.stringify(parsed.error));
              reject(new Error(parsed.error.message || '通义VL API 错误'));
            } else {
              const content = parsed.choices?.[0]?.message?.content || '';
              console.log(`[通义VL] ✅ 成功! 回复长度:${content.length} 总耗时:${Date.now()-startTime}ms`);
              resolve(content);
            }
          } catch (e) {
            console.error('[通义VL] 解析响应失败:', e.message, '原始数据前300字:', data.substring(0, 300));
            reject(new Error('解析通义VL响应失败: ' + e.message));
          }
        });
      });

      req.on('timeout', () => {
        console.warn(`[通义VL] ⚠️ 请求超时(${TIMEOUT_MS}ms), destroy连接`);
        try { req.destroy(); } catch(e) {}
        reject(new Error('通义VL API 请求超时'));
      });

      req.on('socket', (socket) => {
        socket.setTimeout(TIMEOUT_MS + 10000, () => {
          console.warn('[通义VL] ⚠️ Socket级别超时, 强制销毁');
          try { req.destroy(); } catch(e) {}
          reject(new Error('Socket 连接超时'));
        });
      });

      req.on('error', (err) => {
        console.error('[通义VL] ❌ 请求错误:', err.message);
        reject(err);
      });

      req.write(body);
      req.end();
    });
  }

  // 硬性超时兜底
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`通义VL 超时(${TIMEOUT_MS}ms)`)), TIMEOUT_MS + 10000)
  );

  return Promise.race([doRequest(), timeoutPromise]);
}

/**
 * 解析 JSON（从 AI 回复中提取 JSON 块）
 */
function parseJSON(text) {
  // 尝试匹配 ```json ... ``` 块
  const jsonBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonBlock) {
    return JSON.parse(jsonBlock[1].trim());
  }
  // 尝试直接解析
  try {
    return JSON.parse(text.trim());
  } catch {
    // 最后尝试提取花括号内容
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('无法从 AI 回复中提取 JSON');
  }
}

// ==================== 性格色彩话术系统提示词 ====================

const PERSONALITY_SYSTEM_PROMPTS = {
  red: `你是一位"红色"性格的女性美容产品消费者，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 热情开朗，表达欲强，语速较快
- 喜欢新鲜事物，容易被独特包装和概念吸引
- 重视社交认同，喜欢在朋友圈分享
- 决策较快，但有冲动消费倾向
- 不太关注技术细节，更关注"感觉"和"效果"
- 对比心理强，容易被朋友的经历影响

【你的行为规则】
1. 每次回复1-3句话，口语化、活泼，偶尔用感叹号和表情
2. 主动提出疑问、异议或购买信号，推动对话进展
3. 根据用户的回应调整态度：如果用户说得好你会更积极，说不好你会冷淡
4. 不要一次就把所有问题抛出来，要像真实对话一样逐步展开
5. 不要直接说"我是什么性格"，而是通过行为表现性格
6. 对话中自然地涉及：产品效果、价格、竞品对比、朋友推荐、包装/赠品等话题

【对话阶段指引】
- 前2轮：表现出兴趣但带有怀疑，提出初步问题
- 3-4轮：深入讨论具体问题（价格、效果、对比）
- 5-6轮：接近决策，提出最后的顾虑或准备成交
- 7轮+：如果体验好则成交，否则开始流失

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,

  yellow: `你是一位"黄色"性格的女性美容产品消费者，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 直接果断，目标明确，不喜欢绕弯子
- 重视性价比和实际效果，关注数据和事实
- 比较理性，不容易被情绪打动
- 对价格敏感但愿意为真正好的产品付费
- 决策能力强，但需要充分的理由
- 要求专业性和可靠性

【你的行为规则】
1. 每次回复1-3句话，简洁直接，不啰嗦
2. 提出尖锐的实际问题：成分、效果周期、价格对比、售后保障
3. 如果用户的回答空洞无物，你会追问或表示不满
4. 如果用户提供了有价值的信息，你会认可并继续深入
5. 不要直接说"我是什么性格"，而是通过行为表现性格
6. 重点关注：产品成分、性价比、效果证据、售后保障

【对话阶段指引】
- 前2轮：直接切入核心问题，要求提供关键信息
- 3-4轮：对比分析，挑战用户的专业性
- 5-6轮：如果满意，要求给出明确方案和价格
- 7轮+：决策阶段，要么明确购买要么因为不满意离开

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,

  blue: `你是一位"蓝色"性格的女性美容产品消费者，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 谨慎理性，注重细节和分析
- 决策慢，需要充分的信息和证据
- 关注安全性和成分，会仔细研究产品信息
- 习惯做对比研究，不会轻易相信口头承诺
- 内向，话不多但每个问题都有针对性
- 重视长期关系，一旦认可会很忠诚

【你的行为规则】
1. 每次回复1-3句话，语气平静理性
2. 提出深入的专业问题：成分浓度、检测报告、安全性、适用肤质
3. 需要时间思考和做决定，不会立刻表态
4. 如果用户答不上来专业问题，信任度会下降
5. 不要直接说"我是什么性格"，而是通过行为表现性格
6. 重点关注：安全性、成分详情、检测认证、适用性、售后

【对话阶段指引】
- 前2轮：收集信息阶段，详细询问产品细节
- 3-4轮：对比和分析阶段，可能提出质疑
- 5-6轮：综合评估阶段，可能提出最后的顾虑
- 7轮+：如果信任建立，会选择小规格试用；否则继续犹豫

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,

  green: `你是一位"绿色"性格的女性美容产品消费者，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 温和内敛，不善拒绝，说话常带犹豫
- 害怕做错决定，习惯征求他人意见
- 对价格敏感，追求安全感
- 容易被销售压力影响，但也容易被真诚打动
- 决策非常慢，经常说"我再看看""我跟家人商量"
- 重视人际关系和服务态度

【你的行为规则】
1. 每次回复1-3句话，语气犹豫温和，多用"嗯..."和省略号
2. 经常提出拖延性回应：要商量、再看看、考虑一下
3. 如果用户太强势会有压力，如果太温和又无法做决定
4. 被真诚和耐心的服务打动，而非产品特性
5. 不要直接说"我是什么性格"，而是通过行为表现性格
6. 重点关注：价格承受能力、安全感、家人意见、售后保障

【对话阶段指引】
- 前2轮：谨慎了解，不太敢直接提问
- 3-4轮：提出顾虑但很委婉，可能用"别人"做挡箭牌
- 5-6轮：开始犹豫要不要买，需要用户帮忙做决定
- 7轮+：如果感到信任和安心则购买，否则礼貌拒绝

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,
};

/**
 * 生成AI教练对话回复
 */
async function generateCoachReply(personality, scenarioName, personalityName, tips, history, userMessage) {
  const systemPrompt = PERSONALITY_SYSTEM_PROMPTS[personality] || PERSONALITY_SYSTEM_PROMPTS.green;

  // 构建对话上下文
  const messages = [
    { role: 'system', content: systemPrompt },
  ];

  // 加入历史对话（限制最近10轮以控制token）
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'ai') {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  try {
    const reply = await callDeepSeek(messages, {
      temperature: 0.85,
      max_tokens: 256,
    });
    return { reply: reply.trim(), hint: null };
  } catch (err) {
    console.error('DeepSeek 对话调用失败:', err.message);
    // 降级到模拟回复
    return null;
  }
}

/**
 * AI 评分提示词
 */
const EVALUATION_SYSTEM_PROMPT = `你是一位专业的美容行业销售教练，擅长性格色彩销售话术评估。

请根据用户与客户的完整对话记录，从以下8个维度进行评分（每项0-100分）：
1. personality（性格应对）：是否正确识别并适配客户性格类型的沟通方式
2. need_discovery（需求挖掘）：是否通过有效提问深入了解客户需求和痛点
3. empathy（共情能力）：是否让客户感到被理解和关怀
4. professional（专业呈现）：产品知识的表达是否专业、准确、有说服力
5. objection（异议处理）：面对客户疑虑时的应对是否得当
6. closing（成交推动）：是否有效推动成交进程
7. naturalness（自然度）：对话是否自然流畅，像真实交流而非机械话术
8. overall（综合表现）：以上所有维度的综合评分

同时给出：
- result：成交/有兴趣但未成交/流失
- feedback：包含 strengths（优点列表）、improvements（改进建议列表）、summary（一句话总结）

请严格按以下JSON格式返回，不要添加任何其他内容：
{
  "result": "成交/有兴趣但未成交/流失",
  "scores": {
    "overall": 0,
    "personality": 0,
    "need_discovery": 0,
    "empathy": 0,
    "professional": 0,
    "objection": 0,
    "closing": 0,
    "naturalness": 0
  },
  "feedback": {
    "strengths": ["优点1", "优点2"],
    "improvements": ["改进建议1", "改进建议2"],
    "summary": "一句话总结"
  }
}`;

/**
 * 生成AI评估报告
 */
async function generateEvaluation(personality, personalityName, messages, duration) {
  // 构建对话记录文本
  const dialogText = messages
    .map((m) => {
      const role = m.role === 'ai' ? '客户' : '销售顾问';
      return `${role}：${m.content}`;
    })
    .join('\n\n');

  const userMessages = messages.filter((m) => m.role === 'user');

  const prompt = `客户性格类型：${personalityName}（${personality}色）

完整对话记录：
${dialogText}

对话轮次：${userMessages.length}轮
对话时长：${duration || 0}秒

请评估销售顾问的表现。`;

  const apiMessages = [
    { role: 'system', content: EVALUATION_SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  try {
    const raw = await callDeepSeek(apiMessages, {
      temperature: 0.3,
      max_tokens: 1024,
    });
    const evaluation = parseJSON(raw);

    // 校验分数范围
    const clamp = (v) => Math.max(30, Math.min(100, Math.round(v)));
    if (evaluation.scores) {
      for (const key of Object.keys(evaluation.scores)) {
        evaluation.scores[key] = clamp(evaluation.scores[key]);
      }
    }

    return {
      result: evaluation.result || '有兴趣但未成交',
      duration: duration || userMessages.length * 45,
      scores: evaluation.scores || {},
      feedback: evaluation.feedback || { strengths: [], improvements: [], summary: '评估完成' },
    };
  } catch (err) {
    console.error('DeepSeek 评估调用失败:', err.message);
    // 降级到模拟评分
    return null;
  }
}

// ==================== 苏格拉底式提问训练系统提示词 ====================

/**
 * 苏格拉底客户角色提示词 - 根据性格类型生成不同反应
 */
const SOCRATIC_PERSONALITY_PROMPTS = {
  red: `你是一位"红色"性格的美容产品潜在客户，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 热情开朗，表达欲强，语速较快
- 喜欢新鲜事物，容易被独特包装和概念吸引
- 重视社交认同，喜欢在朋友圈分享
- 决策较快，但有冲动消费倾向
- 不太关注技术细节，更关注"感觉"和"效果"
- 对比心理强，容易被朋友的经历影响

【行为规则】
1. 每次回复1-3句话，口语化、活泼，偶尔用感叹号和表情
2. 你是在接受苏格拉底式提问训练的AI客户——用户会用各种提问技巧（澄清式、假设式、反向式、引导式、总结式）与你对话
3. 根据用户提问的质量自然回应：好的提问让你更信任/敞开，差的提问让你敷衍/跑题
4. 不要一次就把所有信息抛出来，像真实对话一样逐步展开
5. 对话围绕护肤/美容话题：你是来了解产品的客户
6. 如果用户的提问很好（深入、专业、有共鸣），你会表现出更多兴趣和购买信号
7. 如果用户的提问太直接或太推销，你会有些防御或转移话题

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,

  yellow: `你是一位"黄色"性格的美容产品潜在客户，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 直接果断，目标明确，不喜欢绕弯子
- 重视性价比和实际效果，关注数据和事实
- 比较理性，不容易被情绪打动
- 对价格敏感但愿意为真正好的产品付费
- 决策能力强，但需要充分的理由
- 要求专业性和可靠性

【行为规则】
1. 每次回复1-3句话，简洁直接，不啰嗦
2. 你在接受苏格拉底式提问训练——用户会通过各种技巧与你对话
3. 好的提问（专业、有逻辑、给数据）会让你认可并继续深入
4. 差的提问（空洞、推销感重）你会挑战或表示不耐烦
5. 关注产品成分、性价比、效果证据、售后保障等实质内容
6. 不要被情感化的语言打动，要事实和证据

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,

  blue: `你是一位"蓝色"性格的美容产品潜在客户，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 谨慎理性，注重细节和分析
- 决策慢，需要充分的信息和证据
- 关注安全性和成分，会仔细研究产品信息
- 习惯做对比研究，不会轻易相信口头承诺
- 内向，话不多但每个问题都有针对性
- 重视长期关系，一旦认可会很忠诚

【行为规则】
1. 每次回复1-3句话，语气平静理性
2. 你在接受苏格拉底式提问训练——用户会使用各种提问技巧
3. 高质量的提问（专业、细致、有依据）会让你信任度提升
4. 浮夸或模糊的回答会让你质疑或追问细节
5. 会问成分浓度、安全性、检测报告、适用肤质等专业问题
6. 需要时间思考和做决定，不会立刻表态

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,

  green: `你是一位"绿色"性格的美容产品潜在客户，正在与一位美容顾问（用户）进行对话。

【你的性格特征】
- 温和内敛，不善拒绝，说话常带犹豫
- 害怕做错决定，习惯征求他人意见
- 对价格敏感，追求安全感
- 容易被销售压力影响，但也容易被真诚打动
- 决策非常慢，经常说"我再看看""我跟家人商量"
- 重视人际关系和服务态度

【行为规则】
1. 每次回复1-3句话，语气犹豫温和，多用"嗯..."和省略号
2. 你在接受苏格拉底式提问训练——用户会通过提问引导你
3. 温和有耐心的问题会让你放松和信任
4. 太强势或太急进的提问会让你有压力或回避
5. 经常提到需要商量、考虑、再看看
6. 被真诚和耐心的服务打动，而非产品特性

【严格要求】只返回对话内容，不要加任何引导语、JSON、标记等额外内容。`,
};

/**
 * 苏格拉底场景提示词前缀 - 注入场景上下文
 */
function getSocraticScenarioPrefix(scenarioInfo) {
  return `【当前训练场景】
场景名称：${scenarioInfo.name}
场景描述：${scenarioInfo.description || ''}
客户背景：${scenarioInfo.customer_background || ''}
初始情况：${scenarioInfo.initial_situation || ''}
训练目标：${scenarioInfo.goal || ''}

以上是这个训练场景的背景。你需要扮演这个场景中的客户，与正在进行苏格拉底式提问练习的销售顾问对话。

${scenarioInfo.tips || ''}
`;
}

/**
 * 生成苏格拉底AI客户回复
 * @param {string} personality - 性格类型 red/yellow/blue/green
 * @param {object} scenarioInfo - 场景信息
 * @param {Array} history - 对话历史 [{role: 'user'|'ai', content: string}]
 * @param {string} userMessage - 用户最新消息
 * @returns {Promise<{content: string, questionType: object, hint: string}>}
 */
async function generateSocraticReply(personality, scenarioInfo, history, userMessage) {
  const systemPrompt = SOCRATIC_PERSONALITY_PROMPTS[personality] || SOCRATIC_PERSONALITY_PROMPTS.red;
  const scenarioPrefix = scenarioInfo ? getSocraticScenarioPrefix(scenarioInfo) : '';

  const fullSystemPrompt = scenarioPrefix + '\n\n' + systemPrompt;

  // 构建对话上下文
  const messages = [
    { role: 'system', content: fullSystemPrompt },
  ];

  // 加入历史对话（限制最近10轮以控制token）
  const recentHistory = history.slice(-10);
  for (const msg of recentHistory) {
    if (msg.role === 'user') {
      messages.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'ai') {
      messages.push({ role: 'assistant', content: msg.content });
    }
  }

  try {
    const reply = await callDeepSeek(messages, {
      temperature: 0.85,
      max_tokens: 256,
    });

    // 同时识别问题类型
    const questionType = await detectQuestionTypeAI(userMessage);

    return {
      reply: reply.trim(),
      questionType: questionType,
      hint: null, // hint将在路由层根据questionType生成
    };
  } catch (err) {
    console.error('DeepSeek 苏格拉底对话调用失败:', err.message);
    return null; // 返回null让路由层降级到规则引擎
  }
}

/**
 * 问题类型AI识别 - 用DeepSeek判断用户提问属于哪种苏格拉底类型
 */
async function detectQuestionTypeAI(userMessage) {
  const defaultType = { type: 'guiding', name: '引导式提问', icon: '➡️', color: '#52c41a', description: '引导方向、推进话题' };

  try {
    const messages = [
      {
        role: 'system',
        content: `你是一位苏格拉底式提问训练专家。分析销售顾问的提问属于哪种苏格拉底提问类型。

5种提问类型：
1. clarification（澄清式提问）- 确认理解、明确需求、聚焦问题。关键词："您说的是...?" "具体说说" "所以您的核心诉求是...?"
2. hypothesis（假设式提问）- 探索可能性、测试意愿、降低防御。关键词："如果...?" "假如有一个方法...?" "要是这样呢?"
3. reverse（反向式提问）- 挑战固有思维、引发思考、制造紧迫感。关键词："有没有想过另一种可能?" "很多人认为...但您觉得呢?"
4. guiding（引导式提问）- 引导方向、推进话题、自然过渡。关键词："那接下来...?" "除了这个还有...?"
5. summary（总结式提问）- 确认理解、展示倾听、推动决策。关键词："所以我理解下来...对吗?" "刚才我们聊到的..."

请严格按以下JSON格式返回，不要添加其他内容：
{"type":"clarification|hypothesis|reverse|guiding|summary","confidence":0.0-1.0}`
      },
      { role: 'user', content: userMessage }
    ];

    const raw = await callDeepSeek(messages, {
      temperature: 0.1, // 低温度确保稳定分类
      max_tokens: 128,
    });

    const result = parseJSON(raw);
    const typeMap = {
      clarification: { type: 'clarification', name: '澄清式提问', icon: '🔍', color: '#1890ff', description: '确认理解、明确需求、聚焦问题' },
      hypothesis: { type: 'hypothesis', name: '假设式提问', icon: '💭', color: '#722ed1', description: '探索可能性、测试意愿、降低防御' },
      reverse: { type: 'reverse', name: '反向式提问', icon: '🔄', color: '#e94560', description: '挑战固有思维、引发思考' },
      guiding: { type: 'guiding', name: '引导式提问', icon: '➡️', color: '#52c41a', description: '引导方向、推进话题、自然过渡' },
      summary: { type: 'summary', name: '总结式提问', icon: '✅', color: '#faad14', description: '确认理解、展示倾听、推动决策' },
    };

    const detected = typeMap[result.type] || typeMap.guiding;
    return {
      ...detected,
      confidence: result.confidence || 0.7,
    };
  } catch (err) {
    console.error('DeepSeek 问题类型识别失败:', err.message);
    return defaultType;
  }
}

/**
 * 苏格拉底AI评分 - �于完整对话进行5维评估
 */
async function generateSocraticEvaluation(personality, personalityName, messages, duration, scenarioInfo) {
  const dialogText = messages
    .map((m) => {
      const role = m.role === 'ai' ? '客户' : '销售顾问';
      return `${role}：${m.content}`;
    })
    .join('\n\n');

  const userMessages = messages.filter((m) => m.role === 'user');
  const userMessageText = userMessages.map(m => m.content).join('\n');

  const prompt = `训练场景：${scenarioInfo?.name || '未知'}
客户性格：${personalityName}（${personality}色）
对话轮次：${userMessages.length}轮
对话时长：${duration || 0}秒

完整对话记录：
${dialogText}

销售顾问的所有提问：
${userMessageText}

请从以下5个维度评分（每项0-100分），并给出反馈：

1. question_score（提问技巧）：提问类型的多样性、是否灵活运用5种苏格拉底提问方式
2. listening_score（倾听理解）：是否通过澄清式和总结式确认理解、让客户感到被尊重
3. guiding_score（引导能力）：是否用引导式和假设式有效推进对话、朝向目标
4. timing_score（时机把握）：反向提问的使用时机是否恰当（不宜过早）、总结式的使用节奏
5. depth_score（深度挖掘）：是否能持续深入挖掘需求、而非停留在表面

同时给出：
- grade：S(90+)/A(80+)/B(65+)/C(50+)/D(低于50)
- highlight_question：最佳提问（原话引用）
- feedback：包含 strengths（优点列表）、improvements（改进建议列表）、summary（一句话总结）

请严格按以下JSON格式返回：
{
  "scores": { "question": 0, "listening": 0, "guiding": 0, "timing": 0, "depth": 0, "overall": 0 },
  "grade": "B",
  "highlight_question": "最佳提问原文",
  "feedback": { "strengths": ["优点1", "优点2"], "improvements": ["改进1", "改进2"], "summary": "一句话总结" }
}`;

  const apiMessages = [
    { role: 'system', content: `你是一位资深销售教练，专精苏格拉底式提问教学法。请根据对话记录客观评分。分数要有区分度，优秀的给85+，普通的给60-75，较差的给40-55。` },
    { role: 'user', content: prompt }
  ];

  try {
    const raw = await callDeepSeek(apiMessages, {
      temperature: 0.3,
      max_tokens: 1024,
    });
    const evaluation = parseJSON(raw);

    // 校验分数范围
    const clamp = (v) => Math.max(20, Math.min(100, Math.round(v)));
    if (evaluation.scores) {
      for (const key of Object.keys(evaluation.scores)) {
        evaluation.scores[key] = clamp(evaluation.scores[key]);
      }
      // 计算总分
      const s = evaluation.scores;
      s.overall = Math.round((s.question + s.listening + s.guiding + s.timing + s.depth) / 5);
    }

    return {
      scores: evaluation.scores || { question: 60, listening: 60, guiding: 60, timing: 60, depth: 60, overall: 60 },
      grade: evaluation.grade || 'C',
      highlight_question: evaluation.highlight_question || '',
      feedback: evaluation.feedback || { strengths: [], improvements: [], summary: '评估完成' },
    };
  } catch (err) {
    console.error('DeepSeek 苏格拉底评分失败:', err.message);
    return null;
  }
}

/**
 * 生成苏格拉底开场白 - AI根据场景动态生成
 */
async function generateSocraticOpening(personality, scenarioInfo) {
  const systemPrompt = `你是一位${personality === 'red' ? '红色（热情型）' : personality === 'yellow' ? '黄色（目标型）' : personality === 'blue' ? '蓝色（分析型）' : '绿色（温和型）'}性格的美容产品潜在客户。请根据以下场景信息，生成一个自然的开场白（1-2句话），作为对话的开始。

场景：${scenarioInfo?.name || ''}
描述：${scenarioInfo?.description || ''}
初始情况：${scenarioInfo?.initial_situation || ''}

要求：
- 自然口语化，像真实客户会说的话
- 符合你的性格特征
- 长度20-60字
- 只返回开场白内容，不加任何标记`;

  try {
    const opening = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '请开始对话，说出你的第一句话。' }
    ], {
      temperature: 0.8,
      max_tokens: 128,
    });
    return opening.trim();
  } catch (err) {
    console.error('DeepSeek 开场白生成失败:', err.message);
    // 降级到硬编码开场白
    const fallbacks = {
      red: '你好呀！我听朋友说你们这边不错，就过来啦~你是？',
      yellow: '你好。直接告诉我，你们产品怎么样？多少钱？我时间不多。',
      blue: '你好。我做了一些功课想来了解一下具体情况。',
      green: '你好呀...我是朋友介绍来的，我也不太懂这些...'
    };
    return fallbacks[personality] || fallbacks.red;
  }
}

/**
 * 生成AI教练开场白 - 根据场景动态生成个性化开场白
 */
async function generateCoachOpening(personality, scenarioInfo) {
  const personalityNames = {
    red: '红色（热情型）',
    yellow: '黄色（目标型）',
    blue: '蓝色（分析型）',
    green: '绿色（温和型）'
  };

  const systemPrompt = `你是一位${personalityNames[personality] || '绿色（温和型）'}性格的女性美容产品潜在客户，正在走进一家美容店/咨询室。

【场景信息】
场景名称：${scenarioInfo?.name || ''}
场景描述：${scenarioInfo?.description || ''}

请根据你的性格特征，生成一个自然的开场白（1-2句话），作为对话的开始。这是你对美容顾问说的第一句话。

要求：
- 自然口语化，像真实客户会说的话
- 符合你的性格特征（${personalityNames[personality]}）
- 长度15-60字
- 可以包含一些情绪、期待或疑问
- 只返回开场白内容，不加任何标记`;

  try {
    const opening = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: '你刚走进店里，看到美容顾问走过来，你说的第一句话是？' }
    ], {
      temperature: 0.85,
      max_tokens: 128,
    });
    return opening.trim();
  } catch (err) {
    console.error('DeepSeek 教练开场白生成失败:', err.message);
    // 降级到数据库预设或硬编码
    return scenarioInfo?.opening_line || null; // null让路由层使用默认值
  }
}

/**
 * 关卡考核AI智能评估 - 对选择题答题结果进行深度分析
 * @param {object} levelInfo - 关卡信息 {name, description}
 * @param {Array} questions - 题目数组（含场景、题目、用户答案、正确答案）
 * @param {object} scoreInfo - 评分信息 {totalScore, passScore, totalQuestions, correctCount}
 * @returns {Promise<object|null>} - AI评估结果或null（降级时）
 */
async function generateLevelEvaluation(levelInfo, questions, scoreInfo) {
  const questionsText = questions.map((q, i) => {
    return `[题目${i + 1}] ${q.scenario || q.question_type}\n你的答案: ${q.user_answer || '未作答'}\n正确答案: ${q.correct_answer}\n是否正确: ${q.is_correct ? '✅' : '❌'}`;
  }).join('\n\n');

  const prompt = `【关卡考核结果】
关卡名称：${levelInfo?.name || ''}
关卡描述：${levelInfo?.description || ''}

总分：${scoreInfo.totalScore}/${scoreInfo.passScore}（及格线）
答对题数：${scoreInfo.correctCount}/${scoreInfo.totalQuestions}

详细答题情况：
${questionsText}

请对这位学员的答题情况进行深度分析，严格按以下JSON格式返回：
{
  "overall_assessment": "一句话总体评价（鼓励性）",
  "strengths": ["优点1", "优点2"],
  "weaknesses": ["薄弱点1", "薄弱点2"],
  "key_mistakes": [
    {
      "question_index": 题目序号,
      "analysis": "为什么错",
      "tip": "学习建议"
    }
  ],
  "study_advice": "针对性的学习建议（2-3句话）",
  "next_step建议": "下一步应该重点学什么"
}`;

  const apiMessages = [
    { role: 'system', content: `你是一位专业的美容行业销售培训教练，擅长从学员的答题结果中发现知识盲点并给出精准的学习建议。请客观、专业且带有鼓励性地分析学员表现。` },
    { role: 'user', content: prompt }
  ];

  try {
    const raw = await callDeepSeek(apiMessages, {
      temperature: 0.4,
      max_tokens: 1024,
    });
    const evaluation = parseJSON(raw);

    return {
      ai_analysis: evaluation.overall_assessment || '',
      strengths: evaluation.strengths || [],
      weaknesses: evaluation.weaknesses || [],
      key_mistakes: evaluation.key_mistakes || [],
      study_advice: evaluation.study_advice || '',
      next_step: evaluation.next_step建议 || evaluation.next_step || '',
      is_ai_evaluated: true,
    };
  } catch (err) {
    console.error('DeepSeek 关卡评估调用失败:', err.message);
    return null;
  }
}

/**
 * 性格色彩话术AI生成 - 根据性格类型和场景动态生成个性化成交话术
 */
async function generatePersonalityScript(personality, scene, keyword) {
  const personalityNames = {
    red: '红色（热情活泼型）',
    yellow: '黄色（目标力量型）',
    blue: '蓝色（完美分析型）',
    green: '绿色（和平温和型）'
  };

  const sceneMap = {
    '破冰': '开场破冰、建立第一印象',
    '产品推荐': '介绍和推荐产品',
    '逼单': '推动客户做购买决定',
    '异议处理': '解答客户疑虑和反对意见',
    '建立信任': '与客户建立信任关系',
    '需求挖掘': '了解客户的真实需求和痛点',
  };

  const sceneDesc = sceneMap[scene] || scene;

  const systemPrompt = `你是一位资深的美容行业销售培训师，专精性格色彩销售法。请根据指定的性格类型和场景，撰写一条高质量的销售实战话术。

要求：
1. 话术必须符合${personalityNames[personality]}的性格特征
2. 场景是"${scene}（${sceneDesc}）"
3. 话术长度50-200字，口语化、自然流畅，像真实销售对话
4. 包含具体的话术表达（可以直接对客户说的话）
5. 同时给出使用技巧说明（什么时候用、怎么配合语气和肢体语言）
6. ${keyword ? `特别关注关键词："${keyword}"，话术要围绕这个主题展开` : ''}

请严格按以下JSON格式返回：
{
  "title": "话术标题（4-8字）",
  "content": "具体的话术内容（可以直接对客户说的原话）",
  "tips": "使用技巧说明（何时用、如何配合语气表情等）",
  "difficulty": 1-3（难度等级：1入门/2进阶/3高级）
}`;

  try {
    const raw = await callDeepSeek([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `请为${personalityNames[personality]}性格的客户，在"${scene}"场景下，生成一条专业的销售话术。` }
    ], {
      temperature: 0.85,
      max_tokens: 512,
    });

    const result = parseJSON(raw);
    return {
      title: result.title || `${scene}话术`,
      content: result.content || '',
      tips: result.tips || '',
      difficulty: Math.min(3, Math.max(1, parseInt(result.difficulty) || 2)),
      is_ai_generated: true,
    };
  } catch (err) {
    console.error('DeepSeek 性格话术生成失败:', err.message);
    return null;
  }
}

/**
 * 性格色彩AI深度解读 - 为指定性格生成个性化的详细分析和沟通策略
 */
async function generatePersonalityInsight(personality, context) {
  const personalityDetails = {
    red: {
      name: '红色性格', color: '#e94560', icon: '🔥',
      coreTrait: '热情开朗，表达欲强，重视社交认同'
    },
    yellow: {
      name: '黄色性格', color: '#faad14', icon: '⚡',
      coreTrait: '目标明确，效率优先，看重结果和价值'
    },
    blue: {
      name: '蓝色性格', color: '#1890ff', icon: '💎',
      coreTrait: '谨慎理性，注重细节，需要数据和证据'
    },
    green: {
      name: '绿色性格', color: '#52c41a', icon: '🌿',
      coreTrait: '温和友善，追求和谐，决策缓慢需要陪伴'
    }
  };

  const p = personalityDetails[personality] || personalityDetails.green;
  const contextInfo = context ? `\n用户关注点：${context}` : '';

  const prompt = `你是一位性格色彩学专家，专注于美容行业的销售应用。请为${p.name}（${p.coreTrait}）提供一份详细的沟通策略指南。

${contextInfo}
请严格按以下JSON格式返回：
{
  "core_analysis": "核心心理分析（2-3句话）",
  "communication_strategy": ["策略要点1", "策略要点2", "策略要点3", "策略要点4"],
  "dos": ["应该做的事1", "应该做的事2"],
  "donts": ["不应该做的事1", "不应该做的事2"],
  "key_phrases": ["有效话术金句1", "有效话术金句2", "有效话术金句3"],
  "typical_objections": ["典型反对意见1及应对方向", "典型反对意见2及应对方向"]
}`;

  try {
    const raw = await callDeepSeek([
      { role: 'system', content: '你是性格色彩学专家，专注美容行业销售应用。输出简洁实用，每项内容精炼。' },
      { role: 'user', content: prompt }
    ], {
      temperature: 0.6,
      max_tokens: 1024,
    });

    return parseJSON(raw);
  } catch (err) {
    console.error('DeepSeek 性格解读失败:', err.message);
    return null;
  }
}

module.exports = {
  generateCoachReply,
  generateEvaluation,
  generateCoachOpening,
  generateLevelEvaluation,
  generatePersonalityScript,
  generatePersonalityInsight,
  callDeepSeek,
  callQwenVL,  // ⭐ 通义千问VL视觉模型
  parseJSON,    // JSON解析工具（从AI回复中提取JSON块）
  // 苏格拉底专用
  generateSocraticReply,
  detectQuestionTypeAI,
  generateSocraticEvaluation,
  generateSocraticOpening,
};
