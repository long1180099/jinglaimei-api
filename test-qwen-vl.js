/**
 * 快速测试：通义千问 VL 皮肤分析
 * 验证 API Key + 模型调用是否正常
 * 
 * 用法: node test-qwen-vl.js [图片路径]
 * 示例: node test-qwen-vl.js test-photo.jpg
 */
const https = require('https');
const fs = require('fs');
const path = require('path');

const QWEN_API_KEY = 'sk-7dd97fec3aef4c62a866e7294e167646';

// 获取图片路径（命令行参数或默认）
const imagePath = process.argv[2];
if (!imagePath || !fs.existsSync(imagePath)) {
  console.error('❌ 请提供有效的图片路径!');
  console.log('用法: node test-qwen-vl.js <图片路径>');
  process.exit(1);
}

console.log(`📸 图片: ${imagePath}`);
console.log(`🔑 API Key: ${QWEN_API_KEY.substring(0, 10)}...`);

// 转 base64
const buffer = fs.readFileSync(imagePath);
const ext = path.extname(imagePath).toLowerCase() || '.jpg';
const mimeMap = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png' };
const mime = mimeMap[ext] || 'image/jpeg';
const base64Str = buffer.toString('base64');
console.log(`📦 大小: ${(buffer.length/1024).toFixed(1)}KB, Base64: ${(base64Str.length/1024).toFixed(1)}KB`);

const SKIN_ANALYSIS_SYSTEM_PROMPT = `你是一位拥有15年经验的专业美容护肤顾问，擅长通过面部照片进行皮肤状况分析。

【重要合规声明】
你的所有分析和建议仅限于"护肤层面"，不涉及任何医疗诊断、疾病治疗、药品及医疗器械相关内容。

【分析任务】
根据用户上传的面部照片，你需要：
1. **识别皮肤问题**：从以下维度检测面部存在的皮肤问题：
   - 斑类问题（雀斑、晒斑、色沉/痘印、黄褐斑、肤色不均）
   - 痘类问题（闭口粉刺、黑头、红肿痘痘、红色痘印、黑色痘印）
   - 皮肤状态（干燥缺水、出油过多、敏感泛红、毛孔粗大、细纹干纹、粗糙不平）
2. **判断整体肤质**：干性/油性/混合性/敏感性/中性
3. **生成原因分析**：针对每个检测到的问题解释形成原因
4. **生成专业话术**：基于检测结果生成可以直接对顾客说的专业护肤建议话术

请严格按以下JSON格式返回：
{
  "skin_type": "dry|oily|combo|sensitive|neutral",
  "skin_type_confidence": 0.85,
  "overview": "总体分析概述",
  "issues": [
    {
      "issue_key": "pore|uneven_tone|dryness等",
      "name": "中文名称",
      "category": "spot|acne|state",
      "severity": 1-5,
      "confidence": 0.0-1.0,
      "area": "forehead|nose|cheek|chin|full_face",
      "description": "具体表现描述",
      "cause_text": "形成原因分析",
      "advice_text": "护肤建议"
    }
  ],
  "cause_analysis": "整体成因分析段落",
  "script": "生成的顾客沟通话术"
}`;

const messages = [
  { role: 'system', content: SKIN_ANALYSIS_SYSTEM_PROMPT },
  { role: 'user', content: [
    { type: 'text', text: '这是一张用户上传的正面面部照片。请仔细观察并分析其皮肤状况。' },
    { type: 'image_url', image_url: { url: `data:${mime};base64,${base64Str}` } },
    { type: 'text', text: '请从色斑、痘痘、肤质状态三个维度全面评估，严格按JSON格式返回。' }
  ]}
];

const body = JSON.stringify({
  model: 'qwen-vl-max',
  messages,
  temperature: 0.6,
  max_tokens: 2500,
  stream: false,
});

console.log(`\n⏳ 发送到 通义千问 qwen-vl-max ...`);
console.log(`   body长度: ${(body.length/1024).toFixed(1)}KB\n`);

const startTime = Date.now();
const reqOptions = {
  hostname: 'dashscope.aliyuncs.com',
  path: '/compatible-mode/v1/chat/completions',
  method: 'POST',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${QWEN_API_KEY}`,
    'Accept': 'application/json',
  },
};

const req = https.request(reqOptions, (res) => {
  console.log(`   状态码: ${res.statusCode} (${Date.now()-startTime}ms)`);
  
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.error) {
        console.error('\n❌ API错误:', JSON.stringify(parsed.error));
        return;
      }
      
      const content = parsed.choices?.[0]?.message?.content || '';
      const usage = parsed.usage;
      
      console.log(`\n✅ 成功! 总耗时: ${Date.now()-startTime}ms`);
      if (usage) {
        console.log(`   Token使用: 输入${usage.prompt_tokens} / 输出${usage.completion_tokens}`);
      }
      console.log(`\n========== AI 分析结果 ==========\n`);
      console.log(content);
      console.log('\n=====================================\n');

      // 尝试解析JSON
      try {
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || null;
        const result = jsonMatch ? JSON.parse(jsonMatch[1].trim()) : JSON.parse(content.trim());
        console.log('========== 解析后的结构化数据 ==========');
        console.log('肤质:', result.skin_type, '| 置信度:', result.skin_type_confidence);
        console.log('总评:', result.overview);
        console.log('检测到', result.issues?.length || 0, '个问题:');
        if (result.issues) {
          result.issues.forEach((iss, i) => {
            console.log(`  ${i+1}. [${iss.severity}级] ${iss.name} (${iss.area}) - ${iss.description?.substring(0,50)}`);
          });
        }
        console.log('话术:', result.script?.substring(0,100));
      } catch(e) {
        console.log('(JSON解析跳过，原始内容如上)');
      }

    } catch (e) {
      console.error('❌ 响应解析失败:', e.message);
      console.error('原始数据:', data.substring(0, 500));
    }
  });
});

req.on('timeout', () => { console.error('❌ 请求超时!'); req.destroy(); });
req.on('error', (err) => { console.error('❌ 请求错误:', err.message); });

req.write(body);
req.end();
