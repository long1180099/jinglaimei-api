/**
 * 性格色彩成交话术系统 - 独立组件
 * 基于 FPA 性格色彩学，针对红/蓝/黄/绿四种客户性格量身定制成交话术
 */

import React, { useState, useCallback } from 'react';
import {
  Row, Col, Card, Typography, Input, Select, Button, Tag, Badge, Avatar,
  Tooltip, Progress, Collapse, Modal, Empty, Space, Divider, message,
  Form, InputNumber,
} from 'antd';
import {
  CustomerServiceOutlined, ThunderboltOutlined, HeartOutlined, BulbOutlined,
  CopyOutlined, RobotOutlined, SoundOutlined, CheckCircleFilled,
  RightOutlined, SearchOutlined, FireOutlined, EyeOutlined, ShareAltOutlined,
  CommentOutlined, EditOutlined, PlusOutlined,
} from '@ant-design/icons';
import { useAppDispatch } from '../store/hooks';
import '../pages/SchoolManagement.css';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

/** 性格色彩类型定义 */
type PersonalityType = 'red' | 'blue' | 'yellow' | 'green';

interface PersonalityConfig {
  key: PersonalityType;
  name: string;
  subtitle: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  icon: React.ReactNode;
  traits: string[];
  communicationTips: string;
  donts: string;
  closingStyle: string;
  keyPhrases: string[];
}

const PERSONALITY_CONFIGS: PersonalityConfig[] = [
  {
    key: 'red',
    name: '红色性格',
    subtitle: '活泼型 · 社交导向',
    color: '#ff4d4f',
    bgGradient: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)',
    borderColor: '#ffa39e',
    icon: <HeartOutlined />,
    traits: ['热情开朗', '喜欢社交', '感性决策', '注重口碑', '容易受影响'],
    communicationTips: '讲成功案例和故事，营造氛围和参与感，多赞美多认同',
    donts: '不要冷冰冰、不要堆数据、不要忽视感受、不要打断对方',
    closingStyle: '氛围感染型',
    keyPhrases: ['姐妹都在用', '朋友圈晒单', '大家都说好', '口碑爆款', '限时秒杀'],
  },
  {
    key: 'blue',
    name: '蓝色性格',
    subtitle: '完美型 · 逻辑导向',
    color: '#1890ff',
    bgGradient: 'linear-gradient(135deg, #e6f7ff 0%, #91d5ff 100%)',
    borderColor: '#69c0ff',
    icon: <BulbOutlined />,
    traits: ['注重细节', '逻辑严密', '追求品质', '善于分析', '做决定谨慎'],
    communicationTips: '提供详细数据和成分表，用科学依据说话，耐心回答每一个问题',
    donts: '不要夸大其词、不要跳过细节、不要催促决定、不要用模糊数据',
    closingStyle: '逻辑说服型',
    keyPhrases: ['权威认证', '科学配方', '对比实验数据', '复购率高达', '品质保证'],
  },
  {
    key: 'yellow',
    name: '黄色性格',
    subtitle: '力量型 · 结果导向',
    color: '#faad14',
    bgGradient: 'linear-gradient(135deg, #fffbe6 0%, #fff1b8 100%)',
    borderColor: '#ffe58f',
    icon: <ThunderboltOutlined />,
    traits: ['果断直接', '目标明确', '追求效率', '掌控欲强', '不喜拖泥带水'],
    communicationTips: '直接给结果和利益点，用数据说话，少讲道理多讲价值',
    donts: '不要啰嗦、不要绕弯子、不要过度解释细节、不要显得犹豫不决',
    closingStyle: '果断逼单型',
    keyPhrases: ['限时优惠', '立享折扣', '马上锁定名额', '市场独家', '业绩翻倍'],
  },
  {
    key: 'green',
    name: '绿色性格',
    subtitle: '和平型 · 关系导向',
    color: '#52c41a',
    bgGradient: 'linear-gradient(135deg, #f6ffed 0%, #b7eb8f 100%)',
    borderColor: '#95de64',
    icon: <CustomerServiceOutlined />,
    traits: ['温和友善', '重视关系', '害怕冲突', '决策缓慢', '需要安全感'],
    communicationTips: '建立信任和安全感，给出承诺和保障，允许慢慢决定',
    donts: '不要施压逼单、不要制造紧迫感、不要忽视疑虑、不要显得急功近利',
    closingStyle: '温水渗透型',
    keyPhrases: ['无效退款', '安心使用', '长期陪伴', '老客户专享', '无风险试用'],
  },
];

/** 话术数据定义 */
interface ScriptData {
  id: string;
  title: string;
  personality: PersonalityType;
  scene: string;
  difficulty: '初级' | '中级' | '高级';
  content: string;
  example: string;
  tips: string;
  likes: number;
  usageCount: number;
  successRate: number;
  tags: string[];
}

const SCRIPTS_DATA: ScriptData[] = [
  // ========== 红色性格话术（活泼型/孔雀型）==========
  {
    id: 'r1', title: '故事营销感染法', personality: 'red',
    scene: '产品推荐', difficulty: '初级',
    content: '红色性格客户是感性决策者，用故事打动她们。\n\n"姐，我给您讲个真实的故事。我们团队有个姐，之前皮肤状态很差，自己都说不敢出门。后来用了我们的产品，3个月后整个人都不一样了，现在天天在朋友圈晒自拍，好几个朋友都被她种草了！"',
    example: '客户："真的这么好吗？" → 销售："真的！她上周还给我发消息说，同事问她是不是做了医美。其实没有，就是用了我们的方案。她现在是我们团队的铁粉，逢人就推荐！"',
    tips: '红色性格客户买的是"感觉"和"可能性"。故事要生动、有画面感，让她能把自己代入其中。',
    likes: 445, usageCount: 1890, successRate: 83, tags: ['故事营销', '情感共鸣', '种草必备'],
  },
  {
    id: 'r2', title: '社群氛围营造法', personality: 'red',
    scene: '团队招募', difficulty: '中级',
    content: '红色性格客户重视归属感和社交氛围。\n\n"姐，我们团队真的特别好！每天大家一起打卡、分享心得，群里特别热闹。上周我们还组织了线下聚会，一起去做了SPA。做代理不只是赚钱，还能认识一群特别好的姐妹！"',
    example: '客户："做代理难不难？" → 销售："有啥难的！群里那么多姐妹带着你，不会的就问。你看XX姐，一开始也是什么都不懂，现在月入过万了。而且大家一起做特别有意思，不孤单！"',
    tips: '红色性格客户最怕的是"一个人孤军奋战"。强调团队氛围、姐妹情谊和互助文化。',
    likes: 312, usageCount: 978, successRate: 78, tags: ['社群营销', '团队氛围', '招募话术'],
  },
  {
    id: 'r3', title: '朋友圈种草引导法', personality: 'red',
    scene: '二次转化', difficulty: '高级',
    content: '引导红色性格客户在社交圈分享，利用她的社交影响力。\n\n"姐，您用了之后效果这么好，不发个朋友圈太可惜了！我帮您拍几张美美的照片，配上文案，保证点赞爆表！而且您分享出去，朋友来问的时候还能帮您带单呢。"',
    example: '客户："我不好意思发" → 销售："有啥不好意思的！效果这么好就该自信地分享！您看这个姐的朋友圈，一发出去就有20多个人问，直接转化了5个客户。分享不是炫耀，是帮姐妹们找到好东西！"',
    tips: '红色性格客户天生爱分享。关键是帮她降低心理门槛，给她准备好内容和素材。',
    likes: 289, usageCount: 876, successRate: 90, tags: ['朋友圈', '社交裂变', '口碑传播'],
  },

  // ========== 蓝色性格话术 ==========
  {
    id: 'b1', title: '成分解析专业介绍法', personality: 'blue',
    scene: '产品介绍', difficulty: '初级',
    content: '蓝色性格需要充分了解产品细节才能下决心。\n\n"姐，我给您详细介绍一下这款产品的核心成分。我们的胶原蛋白采用的是深海鱼胶原蛋白肽，分子量在1000-3000道尔顿之间，这个范围是人体吸收率最高的。根据第三方检测报告，吸收率达到了XX%……"',
    example: '客户："这个真的有用吗？" → 销售："给您看一下我们的检测报告，这是SGS认证的。临床数据显示，连续使用28天后，XX%的受试者皮肤水分提升了XX%。您看这个数据……"',
    tips: '蓝色性格客户会自己查资料、做功课。你越专业、越透明，他们越信任你。随时准备好产品手册和检测报告。',
    likes: 389, usageCount: 1102, successRate: 79, tags: ['专业介绍', '成分解析', '信任建立'],
  },
  {
    id: 'b2', title: 'FAQ预判解答法', personality: 'blue',
    scene: '深度沟通', difficulty: '中级',
    content: '蓝色性格客户在决定前通常有很多疑问，主动预判并解答。\n\n"姐，我猜您可能还有几个疑问，我先给您解答一下：\n1. 关于安全性——我们的产品通过了XX认证，孕妇也可以使用\n2. 关于效果周期——一般28天为一个周期，但2周就能感受到变化\n3. 关于保存方法——开封后放冰箱冷藏……"',
    example: '客户："我还有个问题" → 销售："您是不是想问和药物会不会冲突？这个我专门查过，我们的产品是食品级，不含药物成分，和常规药物不冲突。不过如果您在服用特殊药物，建议间隔2小时。"',
    tips: '蓝色性格客户不会主动问所有问题，但每个未解答的问题都会成为成交障碍。主动预判能大幅提升成交率。',
    likes: 267, usageCount: 856, successRate: 85, tags: ['预判疑问', '深度沟通', '打消顾虑'],
  },
  {
    id: 'b3', title: '对比实验见证法', personality: 'blue',
    scene: '效果证明', difficulty: '高级',
    content: '用对比数据和实验结果说话，满足蓝色性格的逻辑需求。\n\n"姐，给您看一组真实的使用前后对比。这是我们团队XX姐的使用记录：第1周皮肤含水量XX%，第4周提升到XX%，第8周已经到了XX%。她用的是和您一模一样的搭配方案。"',
    example: '客户："效果能保持多久？" → 销售："根据我们跟踪了6个月的数据，停用后效果可以维持2-3个月。而且如果您配合我们的周期方案，可以持续维持在一个很好的水平。给您看这个曲线图……"',
    tips: '蓝色性格需要"证据链"——数据+来源+案例+逻辑。每一步都要有据可查，避免任何模糊表述。',
    likes: 198, usageCount: 654, successRate: 81, tags: ['实验数据', '效果证明', '高级成交'],
  },

  // ========== 黄色性格话术（力量型/老虎型）==========
  {
    id: 'y1', title: '开门见山利益切入法', personality: 'yellow',
    scene: '首次接触', difficulty: '初级',
    content: '直接亮出核心利益，不绕弯子。\n\n"姐，我知道您很忙，我直接说重点。我们现在有个活动，您今天下单的话，能比平时省XXX元。这个价格是给老客户的专属，只有今天。"',
    example: '客户："什么产品？" → 销售："胶原蛋白口服液，我们家的王牌。现在买3盒送1盒，您看行的话我直接帮您下单，5分钟搞定。"',
    tips: '黄色性格客户最讨厌浪费时间，前3句话必须包含利益点。语速要快，语气要坚定，不要留太多思考空间。',
    likes: 328, usageCount: 1245, successRate: 82, tags: ['高效成交', '直接切入', '新人必学'],
  },
  {
    id: 'y2', title: '竞品碾压对比法', personality: 'yellow',
    scene: '异议处理', difficulty: '中级',
    content: '用数据和事实直接对比，让黄色性格客户心服口服。\n\n"姐，我不说别人不好，但数据摆在这里——我们家胶原蛋白含量是XXmg，市面上大部分只有XXmg。价格换算下来，我们的每mg单价反而更低。您是聪明人，这笔账肯定算得清。"',
    example: '客户："别家更便宜" → 销售："给您算笔账：他们128元/盒，含量5000mg；我们198元/盒，含量10000mg。算下来我们每mg才0.0198元，他们要0.0256元。其实我们更划算。"',
    tips: '黄色性格客户尊重的是实力和数据。永远不要贬低竞品，用客观对比让数据说话。',
    likes: 256, usageCount: 987, successRate: 76, tags: ['竞品对比', '数据说话', '异议处理'],
  },
  {
    id: 'y3', title: '稀缺性逼单法', personality: 'yellow',
    scene: '促单成交', difficulty: '高级',
    content: '利用黄色性格的果断和掌控欲，制造紧迫感。\n\n"姐，这个价格我只给您留到今天下午。因为库存就剩最后X套了，团队里已经有3个姐在问了。您要的话我现在就锁定，不然真不敢保证还有。"',
    example: '客户："我考虑一下" → 销售："理解您。但说实话，上次活动也是这样，好多姐说考虑一下，结果第二天就没了。您要实在喜欢，不如先锁定名额，不满意可以退。"',
    tips: '黄色性格客户享受"抢到"的感觉。但注意：制造紧迫感必须基于事实，虚假信息会严重损害信任。',
    likes: 412, usageCount: 1567, successRate: 88, tags: ['限时逼单', '高转化', '成交利器'],
  },

  // ========== 绿色性格话术 ==========
  {
    id: 'g1', title: '温和信任建立法', personality: 'green',
    scene: '破冰接触', difficulty: '初级',
    content: '绿色性格客户需要安全感，不要急于推销。\n\n"姐，您别紧张，我不是来给您推销的。就是想给您介绍一个我自己也在用的好东西。我自己用了半年了，觉得确实不错，所以想分享给您看看。您感兴趣就了解一下，不感兴趣也没关系，咱们还是朋友。"',
    example: '客户："我不太需要..." → 销售："没事没事，您不用有任何压力。我就想让您知道有这个产品。您先了解着，哪天想起来了或者有需要了随时找我。我的微信一直都在，您随时可以问我。"',
    tips: '绿色性格客户最怕被"缠上"。给她们空间和时间，态度要真诚不带目的感，先做朋友再做生意。',
    likes: 356, usageCount: 1345, successRate: 71, tags: ['温和破冰', '零压力', '信任优先'],
  },
  {
    id: 'g2', title: '风险消除保障法', personality: 'green',
    scene: '消除顾虑', difficulty: '中级',
    content: '绿色性格需要充分的安全感才能做决定。\n\n"姐，我特别理解您的顾虑。买东西嘛，谁都会担心。所以我们有完整的保障：7天无理由退换，而且是我个人给您承诺，有问题直接找我，不用走什么流程。您先拿回去试试，要是不满意，我亲自上门给您退。"',
    example: '客户："万一不好用呢？" → 销售："理解！所以我才说您先试试嘛。不好用我全额退给您，一分不少。我自己用了这么久，心里有数才敢这么承诺。您看，这比去店里买还放心，对不对？"',
    tips: '绿色性格的决策障碍是"怕出错"。消除风险感比强调收益更有效。给她一个"退路"，她反而更容易往前走。',
    likes: 278, usageCount: 1023, successRate: 84, tags: ['消除顾虑', '保障承诺', '安心成交'],
  },
  {
    id: 'g3', title: '长期陪伴温水成交法', personality: 'green',
    scene: '持续跟进', difficulty: '高级',
    content: '绿色性格不适合逼单，需要持续的关系经营和耐心。\n\n"姐，好久没跟您聊天了，最近忙不忙？上次给您推荐的产品，您考虑得怎么样了？不着急哈，我就是想着如果有什么疑问的话可以随时帮您解答。对了，最近我们出了个新品的小样，我给您寄一份试试？不收钱的，就当交个朋友。"',
    example: '客户："我还没想好..." → 销售："没关系不着急，买东西确实要想清楚。对了，上次您说皮肤干的问题，我查了一下，可能跟换季有关。我给您整理了一些护肤小贴士，等下发给您看看，对你肯定有帮助。"',
    tips: '绿色性格的成交周期较长，但一旦成交，忠诚度极高。关键是在跟进过程中持续提供价值，而不是每次都想着成交。',
    likes: 234, usageCount: 678, successRate: 87, tags: ['长期跟进', '温水煮蛙', '高忠诚度'],
  },
];

/** 场景选项 */
const SCENE_OPTIONS = [
  { value: '首次接触', label: '首次接触' },
  { value: '产品介绍', label: '产品介绍' },
  { value: '异议处理', label: '异议处理' },
  { value: '促单成交', label: '促单成交' },
  { value: '深度沟通', label: '深度沟通' },
  { value: '效果证明', label: '效果证明' },
  { value: '团队招募', label: '团队招募' },
  { value: '破冰接触', label: '破冰接触' },
  { value: '消除顾虑', label: '消除顾虑' },
  { value: '持续跟进', label: '持续跟进' },
  { value: '二次转化', label: '二次转化' },
  { value: '产品推荐', label: '产品推荐' },
];

/** 性格色彩成交话术系统组件 */
const PersonalityScriptSection: React.FC = () => {
  const dispatch = useAppDispatch();
  const [activePersonality, setActivePersonality] = useState<PersonalityType | 'all'>('all');
  const [searchText, setSearchText] = useState('');
  const [selectedScene, setSelectedScene] = useState<string | undefined>(undefined);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentScript, setCurrentScript] = useState<ScriptData | null>(null);
  const [likedScripts, setLikedScripts] = useState<Set<string>>(new Set());
  const [expandedPersonalities, setExpandedPersonalities] = useState<Set<string>>(() => new Set(['red']));

  // 投喂话术状态
  const [feedModalVisible, setFeedModalVisible] = useState(false);
  const [feedLoading, setFeedLoading] = useState(false);
  const [feedResult, setFeedResult] = useState<any>(null);
  const [feedForm, setFeedForm] = useState({
    raw_content: '',
    personality_type: 'red' as PersonalityType | '',
    scenario: '破冰',
    title: '',
    optimize_style: 'natural',
  });

  const toggleLike = useCallback((scriptId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLikedScripts(prev => {
      const next = new Set(prev);
      if (next.has(scriptId)) next.delete(scriptId);
      else next.add(scriptId);
      return next;
    });
  }, []);

  const copyScript = useCallback((script: ScriptData) => {
    const text = `${script.title}\n\n适用性格：${PERSONALITY_CONFIGS.find(p => p.key === script.personality)?.name}\n应用场景：${script.scene}\n\n话术内容：\n${script.content}`;
    navigator.clipboard?.writeText(text).then(() => {
      message.success('话术已复制到剪贴板');
    }).catch(() => {
      message.error('复制失败，请手动复制');
    });
  }, []);

  const openDetail = useCallback((script: ScriptData) => {
    setCurrentScript(script);
    setDetailModalVisible(true);
  }, []);

  // 筛选话术
  const filteredScripts = SCRIPTS_DATA.filter(script => {
    if (activePersonality !== 'all' && script.personality !== activePersonality) return false;
    if (selectedScene && script.scene !== selectedScene) return false;
    if (searchText) {
      const q = searchText.toLowerCase();
      return script.title.toLowerCase().includes(q) ||
        script.content.toLowerCase().includes(q) ||
        script.tags.some(t => t.toLowerCase().includes(q));
    }
    return true;
  });

  // 按性格分组
  const scriptsByPersonality = (activePersonality === 'all'
    ? PERSONALITY_CONFIGS
    : PERSONALITY_CONFIGS.filter(p => p.key === activePersonality)
  ).map(config => ({
    ...config,
    scripts: filteredScripts.filter(s => s.personality === config.key),
  }));

  const togglePersonalityExpand = (key: string) => {
    setExpandedPersonalities(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // 统计数据
  const totalScripts = SCRIPTS_DATA.length;
  const totalLikes = SCRIPTS_DATA.reduce((sum, s) => sum + s.likes, 0);
  const avgSuccessRate = Math.round(SCRIPTS_DATA.reduce((sum, s) => sum + s.successRate, 0) / totalScripts);
  const totalUsage = SCRIPTS_DATA.reduce((sum, s) => sum + s.usageCount, 0);

  // ==================== 投喂+AI优化 处理函数 ====================

  const handleFeedAndOptimize = async () => {
    if (!feedForm.raw_content.trim()) {
      message.warning('请输入原始话术内容');
      return;
    }

    setFeedLoading(true);
    try {
      const token = localStorage.getItem('jlm_auth_token') || '';
      const response = await fetch('/api/school/admin/personality/scripts/feed-and-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(feedForm),
      });

      const data = await response.json();
      
      if (data.code === 0 || data.data) {
        setFeedResult(data.data);
        message.success('🎉 话术已优化并入库！');
      } else {
        message.error(data.message || '优化失败，请重试');
      }
    } catch (err: any) {
      console.error('投喂优化错误:', err);
      message.error('网络错误：' + (err.message || '未知错误'));
    } finally {
      setFeedLoading(false);
    }
  };


  return (
    <div className="personality-script-section">
      {/* 头部介绍 */}
      <div className="script-hero-banner">
        <div className="script-hero-content">
          <div className="script-hero-text">
            <Title level={2} style={{ margin: 0, color: '#fff' }}>
              <SoundOutlined /> 性格色彩成交话术系统
            </Title>
            <Paragraph style={{ margin: '12px 0 0', color: 'rgba(255,255,255,0.85)', fontSize: 16 }}>
              基于 FPA 性格色彩学，针对红/蓝/黄/绿四种客户性格，量身定制专属成交话术。精准识别客户类型，用对方最舒服的方式沟通，让成交变得自然而然。
            </Paragraph>
          </div>
          <div className="script-hero-stats">
            <div className="hero-stat-item">
              <div className="hero-stat-value">{totalScripts}</div>
              <div className="hero-stat-label">精选话术</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-value">{avgSuccessRate}%</div>
              <div className="hero-stat-label">平均成功率</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-value">{(totalUsage / 1000).toFixed(1)}k</div>
              <div className="hero-stat-label">累计使用</div>
            </div>
            <div className="hero-stat-item">
              <div className="hero-stat-value">{(totalLikes / 1000).toFixed(1)}k</div>
              <div className="hero-stat-label">累计点赞</div>
            </div>
          </div>
        </div>
      </div>

      {/* 性格色彩概览卡片 */}
      <div className="personality-overview">
        <Title level={4} style={{ marginBottom: 16 }}>
          <FireOutlined /> 四色性格速查
        </Title>
        <Row gutter={[16, 16]}>
          {PERSONALITY_CONFIGS.map((config) => (
            <Col xs={24} sm={12} lg={6} key={config.key}>
              <div
                className={`personality-card personality-card-${config.key} ${activePersonality === config.key ? 'active' : ''}`}
                onClick={() => setActivePersonality(activePersonality === config.key ? 'all' : config.key)}
                style={{ cursor: 'pointer' }}
              >
                <div className="personality-card-header" style={{ background: config.bgGradient }}>
                  <div className="personality-icon" style={{ color: config.color }}>
                    {config.icon}
                  </div>
                  <div className="personality-name">{config.name}</div>
                  <div className="personality-subtitle">{config.subtitle}</div>
                </div>
                <div className="personality-card-body">
                  <div className="personality-traits">
                    {config.traits.slice(0, 3).map((trait, i) => (
                      <Tag key={i} color={config.color} className="personality-trait-tag">
                        {trait}
                      </Tag>
                    ))}
                  </div>
                  <div className="personality-tip">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {config.communicationTips.slice(0, 30)}...
                    </Text>
                  </div>
                  <div className="personality-closing">
                    <Tag style={{ borderColor: config.color, color: config.color }}>
                      成交风格：{config.closingStyle}
                    </Tag>
                  </div>
                </div>
              </div>
            </Col>
          ))}
        </Row>
        {activePersonality !== 'all' && (
          <div style={{ marginTop: 8, textAlign: 'center' }}>
            <Button type="link" onClick={() => setActivePersonality('all')}>
              <RightOutlined rotate={180} /> 查看全部性格
            </Button>
          </div>
        )}
      </div>

      {/* 搜索筛选栏 */}
      <Card className="script-filter-bar" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 12]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="搜索话术标题、内容、标签..."
              prefix={<SearchOutlined />}
              allowClear
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              size="large"
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="应用场景"
              allowClear
              value={selectedScene}
              onChange={setSelectedScene}
              style={{ width: '100%' }}
              size="large"
            >
              {SCENE_OPTIONS.map(opt => (
                <Option key={opt.value} value={opt.value}>{opt.label}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="性格色彩"
              allowClear
              value={activePersonality === 'all' ? undefined : activePersonality}
              onChange={v => setActivePersonality(v || 'all')}
              style={{ width: '100%' }}
              size="large"
            >
              {PERSONALITY_CONFIGS.map(p => (
                <Option key={p.key} value={p.key}>{p.name}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Tag color="blue">共 {filteredScripts.length} 条话术</Tag>
              <Button
                icon={<RobotOutlined />}
                onClick={() => setFeedModalVisible(true)}
                type="primary"
                ghost
              >
                ✨ 投喂话术
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 按性格分组的话术列表 */}
      <div className="script-list-by-personality">
        {scriptsByPersonality.map(({ key, name, color, bgGradient, borderColor, subtitle, scripts, traits, communicationTips, donts, closingStyle, keyPhrases, icon }) => (
          <div key={key} className="personality-group">
            <Collapse
              activeKey={expandedPersonalities.has(key) ? [key] : []}
              onChange={() => togglePersonalityExpand(key)}
              className="personality-collapse"
              items={[{
                key,
                label: (
                  <div className="personality-group-header">
                    <div className="personality-group-left">
                      <div className="personality-group-icon" style={{ color, fontSize: 24 }}>
                        {icon}
                      </div>
                      <div>
                        <span className="personality-group-name" style={{ color }}>{name}</span>
                        <span className="personality-group-subtitle">{subtitle}</span>
                        <Tag color={color} className="personality-count-tag">
                          {scripts.length} 条话术
                        </Tag>
                      </div>
                    </div>
                    <div className="personality-group-right">
                      {keyPhrases.slice(0, 3).map((phrase, i) => (
                        <Tag key={i} className="key-phrase-tag" style={{ borderColor: `${color}40`, color }}>{phrase}</Tag>
                      ))}
                    </div>
                  </div>
                ),
                children: (
                  <div className="personality-group-content">
                    {/* 性格分析面板 */}
                    <Card
                      size="small"
                      className="personality-analysis-card"
                      style={{ marginBottom: 16, borderLeft: `4px solid ${color}` }}
                    >
                      <Row gutter={[16, 16]}>
                        <Col xs={24} md={8}>
                          <div className="analysis-section">
                            <Text strong style={{ color, display: 'block', marginBottom: 8 }}>
                              <CheckCircleFilled /> 性格特征
                            </Text>
                            <div className="trait-list">
                              {traits.map((t, i) => (
                                <div key={i} className="trait-item">
                                  <span className="trait-dot" style={{ background: color }} />
                                  {t}
                                </div>
                              ))}
                            </div>
                          </div>
                        </Col>
                        <Col xs={24} md={8}>
                          <div className="analysis-section">
                            <Text strong style={{ color, display: 'block', marginBottom: 8 }}>
                              <BulbOutlined /> 沟通技巧
                            </Text>
                            <Paragraph style={{ fontSize: 13, marginBottom: 0, color: '#555' }}>
                              {communicationTips}
                            </Paragraph>
                          </div>
                        </Col>
                        <Col xs={24} md={8}>
                          <div className="analysis-section">
                            <Text strong style={{ color, display: 'block', marginBottom: 8 }}>
                              <ThunderboltOutlined /> 注意事项
                            </Text>
                            <Paragraph style={{ fontSize: 13, marginBottom: 0, color: '#999' }}>
                              {donts}
                            </Paragraph>
                          </div>
                        </Col>
                      </Row>
                    </Card>

                    {/* 话术卡片列表 */}
                    {scripts.length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {scripts.map((script) => (
                          <Col xs={24} md={12} lg={8} key={script.id}>
                            <div
                              className="script-card"
                              onClick={() => openDetail(script)}
                              style={{ cursor: 'pointer' }}
                            >
                              <div className="script-card-top" style={{ borderBottom: `2px solid ${color}20` }}>
                                <div className="script-card-header">
                                  <Badge
                                    count={script.difficulty === '初级' ? '初级' : script.difficulty === '中级' ? '中级' : '高级'}
                                    style={{
                                      background: script.difficulty === '初级' ? '#52c41a' : script.difficulty === '中级' ? '#faad14' : '#ff4d4f',
                                      fontSize: 11,
                                    }}
                                  />
                                  <Text strong className="script-card-title">{script.title}</Text>
                                </div>
                                <div className="script-card-meta">
                                  <Tag>{script.scene}</Tag>
                                  <Space size={4}>
                                    <span className="meta-item"><EyeOutlined /> {script.usageCount}</span>
                                    <span className="meta-item" style={{ color: likedScripts.has(script.id) ? '#ff4d4f' : '#999' }}>
                                      <HeartOutlined
                                        onClick={(e) => toggleLike(script.id, e)}
                                        style={{ cursor: 'pointer' }}
                                      />
                                      {' '}{script.likes + (likedScripts.has(script.id) ? 1 : 0)}
                                    </span>
                                  </Space>
                                </div>
                              </div>
                              <div className="script-card-body">
                                <Paragraph
                                  ellipsis={{ rows: 3 }}
                                  className="script-card-preview"
                                  style={{ fontSize: 13, color: '#666', marginBottom: 12 }}
                                >
                                  {script.content}
                                </Paragraph>
                                <div className="script-card-footer">
                                  <div className="script-tags">
                                    {script.tags.slice(0, 3).map((tag, i) => (
                                      <Tag key={i} className="script-tag" style={{ borderColor: `${color}50`, color }}>{tag}</Tag>
                                    ))}
                                  </div>
                                  <div className="script-success">
                                    <Progress
                                      percent={script.successRate}
                                      size="small"
                                      strokeColor={color}
                                      format={(p) => `${p}%`}
                                      style={{ width: 80 }}
                                    />
                                  </div>
                                </div>
                              </div>
                              <div className="script-card-actions">
                                <Button type="text" size="small" icon={<EyeOutlined />} onClick={(e) => { e.stopPropagation(); openDetail(script); }}>
                                  查看详情
                                </Button>
                                <Button type="text" size="small" icon={<CopyOutlined />} onClick={(e) => { e.stopPropagation(); copyScript(script); }}>
                                  复制话术
                                </Button>
                                <Button type="text" size="small" icon={<ShareAltOutlined />} onClick={(e) => { e.stopPropagation(); message.info('分享功能开发中'); }}>
                                  分享
                                </Button>
                              </div>
                            </div>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Empty
                        description="暂无匹配的话术"
                        style={{ padding: '40px 0' }}
                      />
                    )}
                  </div>
                ),
              }]}
            />
          </div>
        ))}
      </div>

      {/* 话术详情模态框 */}
      <Modal
        title={null}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={null}
        width={720}
        className="script-detail-modal"
        destroyOnClose
      >
        {currentScript && (() => {
          const config = PERSONALITY_CONFIGS.find(p => p.key === currentScript.personality)!;
          return (
            <div className="script-detail-content">
              {/* 顶部性格标识 */}
              <div className="detail-header" style={{ background: config.bgGradient }}>
                <div className="detail-personality-badge">
                  <span className="detail-badge-icon" style={{ color: config.color }}>
                    {config.icon}
                  </span>
                  <div>
                    <div className="detail-badge-name" style={{ color: config.color }}>{config.name}</div>
                    <div className="detail-badge-subtitle">{config.subtitle}</div>
                  </div>
                </div>
                <Badge
                  count={currentScript.difficulty}
                  style={{
                    background: currentScript.difficulty === '初级' ? '#52c41a' : currentScript.difficulty === '中级' ? '#faad14' : '#ff4d4f',
                  }}
                />
              </div>

              {/* 标题和信息 */}
              <div className="detail-body">
                <Title level={3} style={{ marginBottom: 8 }}>{currentScript.title}</Title>
                <Space wrap style={{ marginBottom: 20 }}>
                  <Tag color={config.color}>{config.name}</Tag>
                  <Tag icon={<FireOutlined />}>{currentScript.scene}</Tag>
                  <Tag>{currentScript.difficulty}</Tag>
                  <span className="detail-stat"><EyeOutlined /> {currentScript.usageCount}次使用</span>
                  <span className="detail-stat"><HeartOutlined /> {currentScript.likes}点赞</span>
                  <span className="detail-stat" style={{ color: config.color }}>成功率 {currentScript.successRate}%</span>
                </Space>

                {/* 话术内容 */}
                <Card
                  title={<span><SoundOutlined /> 话术内容</span>}
                  className="detail-card"
                  style={{ marginBottom: 16 }}
                >
                  <div className="script-content-text">
                    {currentScript.content.split('\n').map((line, i) => (
                      <p key={i} style={{ margin: line.trim() === '' ? '8px 0' : '4px 0' }}>{line}</p>
                    ))}
                  </div>
                  <Divider style={{ margin: '16px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Button
                      type="primary"
                      icon={<CopyOutlined />}
                      onClick={() => copyScript(currentScript)}
                      style={{ background: config.color, borderColor: config.color }}
                    >
                      一键复制话术
                    </Button>
                  </div>
                </Card>

                {/* 对话示例 */}
                <Card
                  title={<span><CommentOutlined /> 对话示例</span>}
                  className="detail-card"
                  style={{ marginBottom: 16 }}
                >
                  <div className="dialog-example">
                    {currentScript.example.split(' → ').map((part, i) => {
                      const isCustomer = i === 0;
                      return (
                        <div key={i} className={`dialog-bubble ${isCustomer ? 'customer' : 'sales'}`}>
                          <div className="dialog-role">
                            <Avatar
                              size="small"
                              style={{ background: isCustomer ? '#faad14' : config.color }}
                            >
                              {isCustomer ? '客' : '销'}
                            </Avatar>
                            <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                              {isCustomer ? '客户' : '销售'}
                            </Text>
                          </div>
                          <div className="dialog-text">{part.replace(/^客户："|销售："/, '').replace(/"$/, '')}</div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                {/* 使用建议 */}
                <Card
                  title={<span><BulbOutlined /> 使用建议</span>}
                  className="detail-card"
                >
                  <Paragraph style={{ color: '#555', lineHeight: 1.8 }}>
                    {currentScript.tips}
                  </Paragraph>
                  <div className="detail-tags-row">
                    {currentScript.tags.map((tag, i) => (
                      <Tag key={i} color={config.color}>{tag}</Tag>
                    ))}
                  </div>
                </Card>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ========== 投喂话术 + AI优化 弹窗 ========== */}
      <Modal
        title={
          <span>
            <EditOutlined /> 投喂话术 · AI智能优化
          </span>
        }
        open={feedModalVisible}
        onCancel={() => { setFeedModalVisible(false); setFeedResult(null); }}
        footer={null}
        width={760}
        destroyOnClose
      >
        <div className="feed-modal-body">
          {/* 步骤提示 */}
          <div className="feed-steps">
            <div className="feed-step">
              <div className="step-num">1</div>
              <div className="step-text">输入你的实战话术</div>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-step">
              <div className="step-num">2</div>
              <div className="step-text">选择目标性格+场景</div>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-step">
              <div className="step-num ai">✨</div>
              <div className="step-text">AI一键优化</div>
            </div>
          </div>

          {!feedResult ? (
            <Form
              layout="vertical"
              onFinish={handleFeedAndOptimize}
              initialValues={feedForm}
              className="feed-form"
            >
              <Form.Item
                label={<span><RobotOutlined /> 原始话术内容</span>}
                name="raw_content"
                rules={[{ required: true, message: '请输入你的原始话术内容' }]}
                extra="可以是你自己实战中用过的成功话术、经验总结，或想改进的粗糙表达"
              >
                <Input.TextArea
                  rows={5}
                  placeholder={`示例：姐，我跟你讲，这个胶原蛋白真的好用。我自己喝了3个月了，皮肤明显紧致了很多。之前我脸上还有点暗沉，现在亮了很多。我们团队的XX姐，之前皮肤问题比我严重多了，现在都在朋友圈晒自拍呢！你要不要试试？`}
                  value={feedForm.raw_content}
                  onChange={(e) => setFeedForm({ ...feedForm, raw_content: e.target.value })}
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label={<span><ThunderboltOutlined /> 目标性格</span>}
                    name="personality_type"
                    rules={[{ required: true }]}
                  >
                    <Select
                      size="large"
                      value={feedForm.personality_type}
                      onChange={(v) => setFeedForm({ ...feedForm, personality_type: v })}
                    >
                      {PERSONALITY_CONFIGS.map(p => (
                        <Option key={p.key} value={p.key}>
                          <Tag color={p.color} style={{ marginRight: 8 }}>{p.icon}</Tag>
                          {p.name}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label={<span><SoundOutlined /> 应用场景</span>}
                    name="scenario"
                    rules={[{ required: true }]}
                  >
                    <Select
                      size="large"
                      value={feedForm.scenario}
                      onChange={(v) => setFeedForm({ ...feedForm, scenario: v })}
                    >
                      <Option value="破冰">👋 破冰开场</Option>
                      <Option value="产品推荐">📦 产品推荐</Option>
                      <Option value="逼单">💰 逼单促单</Option>
                      <Option value="异议处理">🛡️ 异议处理</Option>
                      <Option value="建立信任">🤝 建立信任</Option>
                      <Option value="需求挖掘">🔍 需求挖掘</Option>
                      <Option value="跟进维护">📞 跟进维护</Option>
                      <Option value="团队招募">👥 团队招募</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="优化风格">
                    <Select
                      value={feedForm.optimize_style}
                      onChange={(v) => setFeedForm({ ...feedForm, optimize_style: v })}
                    >
                      <Option value="natural">😊 自然口语化（推荐）</Option>
                      <Option value="professional">🎓 专业严谨型</Option>
                      <Option value="emotional">💫 感染力强型</Option>
                      <Option value="concise">⚡ 精炼直击型</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12} style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <Button
                    type="primary"
                    icon={<RobotOutlined />}
                    htmlType="submit"
                    loading={feedLoading}
                    size="large"
                    block
                    style={{ height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
                  >
                    ✨ 开始AI优化
                  </Button>
                </Col>
              </Row>

              {/* 使用技巧卡片 */}
              <Card
                size="small"
                className="feed-tips-card"
                style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #fff1b8 0%)', border: '1px solid #ffd591' }}
              >
                <div style={{ display: 'flex', gap: 8 }}>
                  <span style={{ fontSize: 20 }}>💡</span>
                  <div>
                    <strong>投喂技巧：</strong> 话术越真实、越有细节，AI优化效果越好。可以直接粘贴你和客户的真实对话记录。
                    <br /><span style={{ color: '#d48806' }}>不需要很完美，AI会帮你润色和结构化。</span>
                  </div>
                </div>
              </Card>
            </Form>
          ) : (
            /* AI优化结果 */
            <div className="feed-result">
              <div className="result-header">
                <CheckCircleFilled style={{ color: '#52c41a', fontSize: 24 }} />
                <div>
                  <div className="result-title">AI优化完成！</div>
                  <div className="result-subtitle">{feedResult.improvement_summary || '话术已保存到数据库'}</div>
                </div>
              </div>

              <Card
                className="result-content-card"
                title={
                  <span>
                    <SoundOutlined /> 优化后的话术内容
                    <Tag color="green" style={{ marginLeft: 8 }}>已入库</Tag>
                  </span>
                }
                size="small"
              >
                <div className="result-text">{feedResult.content || feedResult.script_content}</div>
                
                {feedResult.tips && (
                  <>
                    <Divider />
                    <div style={{ padding: '8px 0' }}>
                      <Text type="secondary" strong>💡 使用建议：</Text>
                      <Paragraph style={{ color: '#555', marginTop: 4 }}>{feedResult.tips}</Paragraph>
                    </div>
                  </>
                )}
              </Card>

              <div className="result-actions">
                <Space>
                  <Button
                    type="primary"
                    icon={<CopyOutlined />}
                    onClick={() => {
                      navigator.clipboard?.writeText(feedResult.content || feedResult.script_content || '');
                      message.success('优化后的话术已复制');
                    }}
                  >
                    复制话术
                  </Button>
                  <Button
                    onClick={() => {
                      setFeedResult(null);
                      setFeedForm({ raw_content: '', personality_type: 'red', scenario: '破冰', title: '', optimize_style: 'natural' });
                    }}
                  >
                    继续投喂
                  </Button>
                  <Button
                    onClick={() => { setFeedModalVisible(false); setFeedResult(null); }}
                  >
                    完成
                  </Button>
                </Space>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};


export default PersonalityScriptSection;
