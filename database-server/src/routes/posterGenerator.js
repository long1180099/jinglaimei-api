/**
 * AI营销海报生成器 - 后端接口
 * 
 * 功能：
 *   1. 获取文案库（企业文化 / 事业金句）
 *   2. AI生成海报图片
 *   3. 历史记录管理
 * 
 * 路由前缀: /api/mp/poster
 */

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { getDB } = require('../utils/db');
const { success, error } = require('../utils/response');

// ==================== 文案库 ====================

// 玫小可事业金句
const BUSINESS_QUOTES = [
  // 成长励志类
  "玫小可告诉你：不是看到希望才坚持，而是坚持了才有希望。",
  "每一个不起眼的今天，都是你未来闪闪发光的铺垫。— 玫小可",
  "玫小可说：与其仰望别人的光，不如自己成为那道光。",
  "在玫小可的世界里，没有白走的路，每一步都算数。",
  "玫小可提醒你：种一棵树最好的时间是十年前，其次是现在。",
  
  // 事业心态类
  "玫小可的生意经：先让自己值钱，再让时间为你赚钱。",
  "别让犹豫偷走你的梦想，玫小可陪你一起勇敢出发。",
  "玫小可相信：认真做事的人，运气都不会太差。",
  "玫小可说：成功的路上并不拥挤，因为坚持的人不多。",
  "玫小可的人生信条：要么出众，要么出局。",
  
  // 团队凝聚类
  "一个人可以走得很快，但一群人才能走得更远。— 玫小可团队",
  "玫小可邀请你：加入我们，一起做更好的自己。",
  "玫小可团队：因为相信，所以看见。",
  "玫小可说：最好的投资，是投资自己。",
  "玫小可与你同行：让努力有方向，让梦想有回响。",
  
  // 行动激励类
  "玫小可喊话：行动起来，就是现在！",
  "玫小可的日常：不抱怨，只改变。",
  "玫小可说：你的坚持，终将美好。",
  "玫小可寄语：愿你眼里有光，心中有爱，脚下有路。",
  "玫小可提醒：今天的努力，是为了明天的选择权。",
];

// 企业文化类
const CULTURE_QUOTES = [
  "静莱美 — 让美成为一种生活方式",
  "静莱美 · 致敬每一位追求美的你",
  "美不自知，因你而觉 — 静莱美",
  "静莱美：用心做好每一件产品",
  "美丽从内而外，静莱美陪你绽放",
  "静莱美 — 你的美丽管家",
  "选择静莱美，选择更好的自己",
  "静莱美：品质如一，美丽如初",
  "每一瓶都用心，每一刻都美丽 — 静莱美",
  "静莱美 · 让自信从肌肤开始",
];

// ==================== 图片风格模板 ====================

const STYLE_TEMPLATES = {
  scenic: {
    name: '唯美风景',
    description: '大气治愈系风景背景',
    prompts: [
      'beautiful serene landscape at sunrise with soft golden light, misty mountains in distance, calm lake reflection, dreamy atmosphere, high quality photography',
      'stunning sunset over ocean waves with golden hour light, peaceful and inspirational mood, cinematic composition, 4K quality',
      'ethereal cherry blossom garden with soft pink petals falling, gentle breeze, magical spring morning, dreamy bokeh background',
      'majestic mountain peak above clouds at dawn, inspiring vista, golden sunlight breaking through, epic landscape photography',
      'peaceful lavender field at twilight, purple hues, warm sunset glow, romantic and calming atmosphere',
    ],
    textColor: '#FFFFFF',
    textStyle: '优雅衬线字体，带微妙阴影'
  },
  minimal: {
    name: '简约商务',
    description: '干净专业的商务风格',
    prompts: [
      'clean minimalist abstract background with soft gradient from white to light gray, subtle geometric patterns, professional corporate aesthetic, ample white space',
      'modern minimalist design with soft pastel gradient, clean lines, sophisticated business aesthetic, elegant simplicity',
      'abstract watercolor wash in muted tones of blue and beige, artistic yet professional, clean composition with negative space',
      'minimalist marble texture with gold accent details, luxury clean aesthetic, sophisticated neutral palette',
      'soft gradient mesh in rose gold and cream tones, modern clean design, elegant minimalism',
    ],
    textColor: '#2C3E50',
    textStyle: '现代无衬线粗体'
  },
  chinese: {
    name: '国潮新中式',
    description: '东方美学质感',
    prompts: [
      'traditional Chinese ink wash painting style landscape, misty mountains and pine trees, elegant brush strokes, classical oriental art aesthetic, soft color palette',
      'modern Chinese style composition with bamboo leaves and moon, traditional aesthetics meets contemporary design, elegant ink painting feel',
      'classical Chinese garden scene with lotus pond, stone bridge, willow trees, poetic oriental atmosphere, refined artistry',
      'traditional Chinese calligraphy background with mountain and river elements, cultural elegance, artistic ink wash texture',
      'oriental zen garden with raked sand, smooth stones, minimalist Japanese-Chinese fusion, peaceful meditation aesthetic',
    ],
    textColor: '#8B4513',
    textStyle: '毛笔书法风格字体'
  },
  vibrant: {
    name: '活力渐变',
    description: '时尚潮流渐变色',
    prompts: [
      'vibrant gradient background with pink and orange sunset colors, dynamic energy, modern social media aesthetic, eye-catching design',
      'colorful aurora borealis night sky with vivid green and purple lights, magical and energetic, stunning natural phenomenon',
      'tropical paradise with colorful sunset, palm silhouettes, warm vibrant tones, vacation and freedom vibe',
      'neon city lights reflected on wet pavement at night, urban energy, colorful reflections, modern nightlife aesthetic',
      'rainbow colored abstract fluid art, bold vibrant gradients, creative and expressive, contemporary digital art style',
    ],
    textColor: '#FFFFFF',
    textStyle: '粗体无衬线，高对比度'
  }
};

/**
 * GET /api/mp/poster/quotes - 获取文案库
 */
router.get('/quotes', async (req, res) => {
  const type = req.query.type || 'all';
  
  let data = {};
  
  if (type === 'all' || type === 'business') {
    data.business = BUSINESS_QUOTES.map((text, index) => ({
      id: 'b_' + index,
      text,
      category: '事业金句',
      source: '玫小可'
    }));
  }
  
  if (type === 'all' || type === 'culture') {
    data.culture = CULTURE_QUOTES.map((text, index) => ({
      id: 'c_' + index,
      text,
      category: '企业文化',
      source: '静莱美'
    }));
  }
  
  success(res, data);
});

/**
 * GET /api/mp/poster/styles - 获取可用风格列表
 */
router.get('/styles', async (req, res) => {
  const styles = Object.keys(STYLE_TEMPLATES).map(key => ({
    id: key,
    name: STYLE_TEMPLATES[key].name,
    description: STYLE_TEMPLATES[key].description,
    previewColor: key === 'scenic' ? '#87CEEB' : 
                  key === 'minimal' ? '#F5F5DC' :
                  key === 'chinese' ? '#DEB887' : '#FF6B6B'
  }));
  
  success(res, styles);
});

/**
 * POST /api/mp/poster/generate - 生成海报
 * Body: { style, quoteId(可选), customText(可选), quoteType }
 */
router.post('/generate', async (req, res) => {
  try {
    const { style, quoteId, customText, quoteType } = req.body;
    
    if (!style || !STYLE_TEMPLATES[style]) {
      return error(res, '请选择有效的风格', 400);
    }
    
    // 确定文案内容
    let textContent;
    if (customText && customText.trim()) {
      textContent = customText.trim();
    } else {
      // 从文案库中选一条
      const quotes = quoteType === 'culture' ? CULTURE_QUOTES : BUSINESS_QUOTES;
      if (quoteId !== undefined) {
        const idx = parseInt(String(quoteId).replace(/^[bc]_/, ''));
        textContent = quotes[idx] || quotes[Math.floor(Math.random() * quotes.length)];
      } else {
        textContent = quotes[Math.floor(Math.random() * quotes.length)];
      }
    }
    
    // 选择该风格的prompt（随机选一个变体）
    const template = STYLE_TEMPLATES[style];
    const bgPrompt = template.prompts[Math.floor(Math.random() * template.prompts.length)];
    
    // 构建完整的图像生成prompt
    // 包含：背景风格 + 文案排版提示
    const fullPrompt = `${bgPrompt}, poster layout with elegant text space in center or lower third, suitable for adding Chinese motivational quote overlay, ${style === 'chinese' ? 'Chinese aesthetic' : 'professional photography'}, vertical portrait orientation 3:4`;
    
    success(res, {
      prompt: fullPrompt,
      text: textContent,
      style: template.name,
      note: '请前端调用AI图像服务生成本图，再将文字叠加到图片上'
    });
    
  } catch (e) {
    console.error('[海报生成] 错误:', e.message);
    error(res, '生成失败: ' + e.message, 500);
  }
});

/**
 * POST /api/mp/poster/random - 随机一键生成（最简单的调用方式）
 * Body: { style? } 可选风格，不传则随机
 */
router.post('/random', async (req, res) => {
  try {
    const style = req.query.style || Object.keys(STYLE_TEMPLATES)[Math.floor(Math.random() * Object.keys(STYLE_TEMPLATES).length)];
    const quoteType = Math.random() > 0.5 ? 'business' : 'culture';
    
    const template = STYLE_TEMPLATES[style];
    const quotes = quoteType === 'culture' ? CULTURE_QUOTES : BUSINESS_QUOTES;
    const textContent = quotes[Math.floor(Math.random() * quotes.length)];
    const bgPrompt = template.prompts[Math.floor(Math.random() * template.prompts.length)];
    
    const fullPrompt = `${bgPrompt}, poster layout with elegant text space, suitable for Chinese quote overlay, ${style === 'chinese' ? 'Chinese aesthetic' : 'professional photography'}, vertical portrait 3:4 ratio, high quality`;
    
    success(res, {
      prompt: fullPrompt,
      text: textContent,
      style: template.name,
      styleKey: style,
      textColor: template.textColor,
      category: quoteType === 'business' ? '事业金句' : '企业文化'
    });
    
  } catch (e) {
    console.error('[海报随机生成] 错误:', e.message);
    error(res, '生成失败: ' + e.message, 500);
  }
});

module.exports = router;
module.exports.STYLE_TEMPLATES = STYLE_TEMPLATES;
module.exports.BUSINESS_QUOTES = BUSINESS_QUOTES;
module.exports.CULTURE_QUOTES = CULTURE_QUOTES;
