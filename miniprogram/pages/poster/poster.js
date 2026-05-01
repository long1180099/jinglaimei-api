/**
 * AI营销海报生成器 - 小程序页面
 * 
 * 功能：
 *   1. 选择风格（唯美风景/简约商务/国潮新中式/活力渐变）
 *   2. 选择文案（事业金句/企业文化 / 自定义）
 *   3. 一键生成图片（纯Canvas渲染，含真实风景元素）
 *   4. 预览 & 保存到相册
 *
 * 4种风格均包含丰富的风景/视觉元素绘制
 */

const api = require('../../utils/api');

// ==================== 风格配色方案 ====================
const STYLE_SCHEMES = {
  scenic: {
    name: '唯美风景',
    skyTop: '#1a2a6c',
    skyMid: '#b21f1f',
    skyBot: '#fdbb2d',
    textColor: '#FFFFFF',
    accentColor: '#FFD700'
  },
  minimal: {
    name: '简约商务',
    bgMain: '#FFFFFF',
    bgAccent: '#F0F2F5',
    textColor: '#2C3E50',
    accentColor: '#e94560'
  },
  chinese: {
    name: '国潮新中式',
    inkDark: '#1a1a2e',
    inkMid: '#2d2d44',
    inkLight: '#4a4a5e',
    paperColor: '#F5F0E8',
    textColor: '#F5DEB3',
    accentColor: '#C41E3A',
    sealRed: '#B22222'
  },
  vibrant: {
    name: '活力渐变',
    skyColors: ['#0f0c29', '#302b63', '#24243e'],
    glow1: '#f093fb',
    glow2: '#f5576c',
    glow3: '#ffd89b',
    textColor: '#FFFFFF',
    accentColor: '#FFE066'
  }
};

Page({
  data: {
    styles: [],
    currentStyle: '',

    quotes: {
      business: [],
      culture: []
    },

    currentQuote: null,
    customText: '',
    activeTab: 'business',

    generating: false,
    generatedImage: '',
    showPreview: true,

    canvasReady: false
  },

  onLoad() {
    const styleList = Object.keys(STYLE_SCHEMES).map(key => ({
      id: key,
      name: STYLE_SCHEMES[key].name,
      description: key === 'scenic' ? '唯美系风景背景' :
                   key === 'minimal' ? '专业商务风格' :
                   key === 'chinese' ? '东方美学质感' : '时尚潮流渐变色',
      previewColor: key === 'scenic' ? '#87CEEB' :
                    key === 'minimal' ? '#F5F5DC' :
                    key === 'chinese' ? '#DEB887' : '#FF6B6B'
    }));

    this.setData({
      styles: styleList,
      currentStyle: styleList[0].id
    });

    this.loadQuotes();
  },

  loadQuotes() {
    api.poster.getQuotes('all').then(res => {
      if (res) {
        this.setData({
          'quotes.business': res.business || [],
          'quotes.culture': res.culture || []
        });
        if (res.business && res.business.length > 0) {
          this.setData({ currentQuote: res.business[0] });
        }
      }
    }).catch(() => { /* 静默 */ });
  },

  onStyleTap(e) {
    const styleId = e.currentTarget.dataset.id;
    this.setData({ currentStyle: styleId });
  },

  onTabChange(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
  },

  onQuoteSelect(e) {
    const id = e.currentTarget.dataset.id;
    const list = this.data.quotes[this.data.activeTab];
    const quote = list.find(q => q.id === id);
    if (quote) {
      this.setData({ currentQuote: quote, customText: '' });
    }
  },

  onCustomInput(e) {
    this.setData({ customText: e.detail.value });
  },

  /** 随机灵感生成 */
  async onRandomGenerate() {
    if (this.data.generating) return;

    this.data.generating = true;
    this.setData({ generating: true, generatedImage: '' });

    try {
      wx.showLoading({ title: 'AI灵感创作中...', mask: true });

      let text, styleKey;
      try {
        const res = await api.poster.randomGenerate(this.data.currentStyle);
        if (res && res.text) {
          text = res.text;
          styleKey = res.styleKey || this.data.currentStyle;
        } else { throw new Error('空数据'); }
      } catch (_) {
        const allQuotes = [...(this.data.quotes.business || []), ...(this.data.quotes.culture || [])];
        const pick = allQuotes[Math.floor(Math.random() * allQuotes.length)];
        text = pick ? pick.text : '玫小可告诉你：坚持就是胜利！';
        styleKey = this.data.currentStyle;
      }

      wx.hideLoading();

      this.setData({ currentQuote: { text }, currentStyle: styleKey });
      await this.drawPoster(text, styleKey);

    } catch (err) {
      console.error('[随机生成失败]', err);
      wx.hideLoading();
      wx.showToast({ title: err.message || '生成失败', icon: 'none' });
    } finally {
      this.data.generating = false;
      this.setData({ generating: false });
    }
  },

  /** 按当前选择生成海报 */
  async onGenerate() {
    if (this.data.generating) return;

    const text = this.data.activeTab === 'custom' ? this.data.customText.trim() :
                 (this.data.currentQuote ? this.data.currentQuote.text : '');

    if (!text) {
      wx.showToast({ title: '请先选择或输入文案', icon: 'none' });
      return;
    }

    this.data.generating = true;
    this.setData({ generating: true, generatedImage: '' });

    try {
      wx.showLoading({ title: '正在绘制海报...', mask: true });
      await this.drawPoster(text, this.data.currentStyle);
      wx.hideLoading();
    } catch (err) {
      console.error('[海报绘制失败]', err);
      wx.hideLoading();
      wx.showToast({ title: '绘制失败，请重试', icon: 'none' });
    } finally {
      this.data.generating = false;
      this.setData({ generating: false });
    }
  },

  /**
   * 核心绘制函数 - 根据风格分发到对应绘制方法
   */
  drawPoster(text, styleKey) {
    return new Promise((resolve, reject) => {
      const query = wx.createSelectorQuery().in(this);
      query.select('#posterCanvas').fields({ node: true, size: true }).exec((res) => {
        if (!res[0]) { reject(new Error('Canvas未找到')); return; }

        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');
        const dpr = wx.getWindowInfo().pixelRatio;
        const W = res[0].width;
        const H = res[0].height;

        canvas.width = W * dpr;
        canvas.height = H * dpr;
        ctx.scale(dpr, dpr);

        // 根据风格选择绘制方法
        const drawFn = {
          scenic: () => this._drawScenic(ctx, W, H, text),
          minimal: () => this._drawMinimal(ctx, W, H, text),
          chinese: () => this._drawChinese(ctx, W, H, text),
          vibrant: () => this._drawVibrant(ctx, W, H, text)
        };

        (drawFn[styleKey] || drawFn.scenic)();

        // 导出为图片
        setTimeout(() => {
          wx.canvasToTempFilePath({
            canvas: canvas,
            destWidth: W * 3,
            destHeight: H * 3,
            success: (tempRes) => {
              this.setData({
                generatedImage: tempRes.tempFilePath,
                showPreview: true
              });
              wx.vibrateShort({ type: 'medium' });
              resolve(tempRes.tempFilePath);
            },
            fail: (err) => {
              console.error('[canvas导出失败]', err);
              reject(err);
            }
          }, this);
        }, 300);
      });
    });
  },

  // ================================================================
  //  风格1：唯美风景 — 日落湖光山色 / 晨曦樱花 / 星空极光
  // ================================================================
  _drawScenic(ctx, W, H, text) {
    const s = STYLE_SCHEMES.scenic;

    // ---- 天空渐变（日落色调）----
    const skyGrad = ctx.createLinearGradient(0, 0, 0, H * 0.65);
    skyGrad.addColorStop(0, '#0d1b3e');
    skyGrad.addColorStop(0.25, '#1a3a6e');
    skyGrad.addColorStop(0.5, '#c94b4b');
    skyGrad.addColorStop(0.75, '#e8874e');
    skyGrad.addColorStop(1, '#fdbb2d');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, W, H);

    // ---- 星星（上层天空）----
    for (let i = 0; i < 40; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H * 0.35;
      const sr = 0.4 + Math.random() * 1.2;
      const alpha = 0.2 + Math.random() * 0.7;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFF';
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      // 十字星光
      if (sr > 0.8) {
        ctx.globalAlpha = alpha * 0.3;
        ctx.fillRect(sx - sr * 2, sy - 0.2, sr * 4, 0.4);
        ctx.fillRect(sx - 0.2, sy - sr * 2, 0.4, sr * 4);
      }
    }
    ctx.globalAlpha = 1;

    // ---- 太阳/月亮 ----
    const sunX = W * 0.65;
    const sunY = H * 0.38;
    const sunR = W * 0.12;
    // 外层光晕
    for (let g = 5; g > 0; g--) {
      const glowR = sunR + g * 12;
      const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.5, sunX, sunY, glowR);
      glow.addColorStop(0, 'rgba(255,220,100,' + (0.15 / g) + ')');
      glow.addColorStop(1, 'rgba(255,180,50,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sunX, sunY, glowR, 0, Math.PI * 2);
      ctx.fill();
    }
    // 太阳本体
    const sunBody = ctx.createRadialGradient(sunX - sunR * 0.2, sunY - sunR * 0.2, 0, sunX, sunY, sunR);
    sunBody.addColorStop(0, '#FFFACD');
    sunBody.addColorStop(0.5, '#FFD700');
    sunBody.addColorStop(1, '#FF8C00');
    ctx.fillStyle = sunBody;
    ctx.beginPath();
    ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
    ctx.fill();

    // ---- 远山（3层，由远及近）----
    const drawMountain = (baseY, heightFactor, color, offsetX) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(-10, baseY + 20);
      const peaks = 4 + Math.floor(Math.random() * 3);
      let px = -10;
      for (let p = 0; p <= peaks; p++) {
        px += (W + 20) / peaks + (Math.random() * 20 - 10);
        const peakH = heightFactor * (0.5 + Math.random() * 0.5);
        ctx.lineTo(px, baseY - peakH);
      }
      ctx.lineTo(W + 10, baseY + 20);
      ctx.closePath();
      ctx.fill();
    };
    drawMountain(H * 0.52, H * 0.18, 'rgba(25,35,60,0.55)', 0);       // 最远山
    drawMountain(H * 0.57, H * 0.15, 'rgba(35,45,70,0.65)', W * 0.05);  // 中层山
    drawMountain(H * 0.62, H * 0.11, 'rgba(45,55,85,0.75)', -W * 0.03);// 近山

    // ---- 湖面/水面 ----
    const waterY = H * 0.64;
    const waterGrad = ctx.createLinearGradient(0, waterY, 0, H);
    waterGrad.addColorStop(0, 'rgba(15,25,55,0.8)');
    waterGrad.addColorStop(0.3, 'rgba(25,40,80,0.7)');
    waterGrad.addColorStop(1, 'rgba(10,18,40,0.95)');
    ctx.fillStyle = waterGrad;
    ctx.fillRect(0, waterY, W, H - waterY);

    // 水面波光
    for (let i = 0; i < 25; i++) {
      const wx_c = Math.random() * W;
      const wy = waterY + 5 + Math.random() * (H - waterY - 10);
      ctx.globalAlpha = 0.03 + Math.random() * 0.08;
      ctx.fillStyle = '#FFF';
      ctx.fillRect(wx_c, wy, 8 + Math.random() * 20, 0.5);
    }
    ctx.globalAlpha = 1;

    // 太阳倒影（水面拉伸）
    ctx.save();
    ctx.globalAlpha = 0.2;
    const reflectGrad = ctx.createLinearGradient(sunX - 15, waterY, sunX + 15, H);
    reflectGrad.addColorStop(0, 'rgba(255,215,0,0.6)');
    reflectGrad.addColorStop(0.5, 'rgba(255,140,0,0.2)');
    reflectGrad.addColorStop(1, 'rgba(255,100,0,0)');
    ctx.fillStyle = reflectGrad;
    ctx.fillRect(sunX - 15, waterY + 2, 30, H - waterY - 2);
    ctx.restore();

    // ---- 飞鸟剪影（3只）----
    const drawBird = (bx, by, size, angle) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angle || 0);
      ctx.fillStyle = 'rgba(20,20,40,0.5)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(size * 0.3, -size * 0.4, size, -size * 0.15);
      ctx.quadraticCurveTo(size * 0.5, 0, size, size * 0.15);
      ctx.quadraticCurveTo(size * 0.3, size * 0.4, 0, 0);
      ctx.fill();
      ctx.restore();
    };
    drawBird(W * 0.2, H * 0.22, 10, -0.15);
    drawBird(W * 0.26, H * 0.19, 7, -0.1);
    drawBird(W * 0.23, H * 0.24, 5, -0.2);

    // ---- 底部芦苇/草丛剪影 ----
    ctx.fillStyle = 'rgba(15,20,35,0.7)';
    for (let i = 0; i < 30; i++) {
      const gx = (i / 30) * W + Math.random() * 8 - 4;
      const gh = 10 + Math.random() * 25;
      const gw = 1.5 + Math.random() * 2;
      ctx.beginPath();
      ctx.moveTo(gx, H);
      ctx.quadraticCurveTo(gx + gw * 0.5, H - gh * 0.6, gx + gw * (i % 2 ? 1.5 : -0.5), H - gh);
      ctx.quadraticCurveTo(gx + gw, H - gh * 0.3, gx + gw, H);
      ctx.closePath();
      ctx.fill();
    }

    // ---- 文案区域（半透明暗底）----
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    this._roundRect(ctx, W * 0.06, H * 0.68, W * 0.88, H * 0.26, 14);

    // 标题
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = s.accentColor;
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2728 \u73ab\u5c0f\u53ef \u00b7 \u6bcf\u65e5\u91d1\u53e5 \u2728', W / 2, H * 0.71);

    // 分割线
    ctx.strokeStyle = s.accentColor;
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(W * 0.28, H * 0.73);
    ctx.lineTo(W * 0.72, H * 0.73);
    ctx.stroke();

    // 主文案
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.textColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    const maxW = W * 0.82;
    const lines = this._wrapText(ctx, text, maxW);
    const lineH = 25;
    const startY = H * 0.76;
    lines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, startY + idx * lineH);
    });

    // 重置阴影
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;

    // 底部品牌
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = s.textColor;
    ctx.font = '10px sans-serif';
    ctx.fillText('\u2014 \u9759\u83b1\u7f8e \u00b7 AI\u8425\u9500\u6d77\u62a5 \u2014', W / 2, H * 0.96);
  },


  // ================================================================
  //  风格2：简约商务 — 几何构图 + 金色点缀 + 专业感
  // ================================================================
  _drawMinimal(ctx, W, H, text) {
    const s = STYLE_SCHEMES.minimal;

    // 纯白背景
    ctx.fillStyle = s.bgMain;
    ctx.fillRect(0, 0, W, H);

    // 左侧大面积留白 + 右下角几何装饰区
    // 右侧金色装饰条
    ctx.fillStyle = 'rgba(233,69,96,0.06)';
    ctx.fillRect(W * 0.55, 0, W * 0.45, H);

    // 几何线条装饰
    ctx.strokeStyle = 'rgba(233,69,96,0.08)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.58 + i * 12, 0);
      ctx.lineTo(W * 0.58 + i * 12 + 80, H);
      ctx.stroke();
    }

    // 圆形装饰元素
    ctx.strokeStyle = 'rgba(200,200,200,0.25)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.2, 50, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(W * 0.82, H * 0.2, 35, 0, Math.PI * 2);
    ctx.stroke();

    // 小实心圆点
    ctx.fillStyle = s.accentColor;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.arc(W * 0.72, H * 0.32, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.arc(W * 0.86, H * 0.14, 6, 0, Math.PI * 2);
    ctx.fill();

    // 底部金色横线
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = s.accentColor;
    ctx.fillRect(0, H * 0.92, W, 3);

    // 顶部细线
    ctx.globalAlpha = 0.15;
    ctx.fillRect(0, 0, W, 1);

    // 左侧品牌标识竖线
    ctx.globalAlpha = 0.6;
    ctx.fillRect(W * 0.08, H * 0.15, 2, H * 0.12);

    // 品牌名
    ctx.globalAlpha = 0.8;
    ctx.fillStyle = s.textColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('JINGLAMEI', W * 0.08, H * 0.11);

    // 主文案区域
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.textColor;
    ctx.font = 'bold 19px sans-serif';
    ctx.textAlign = 'center';

    const maxW = W * 0.82;
    const lines = this._wrapText(ctx, text, maxW);
    const lineH = 30;
    const totalH = lines.length * lineH;
    const startY = H * 0.36 + ((H * 0.4 - totalH) / 2);

    lines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, startY + idx * lineH);
    });

    // 文案下方装饰短线
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = s.accentColor;
    const decoY = startY + lines.length * lineH + 12;
    ctx.fillRect(W * 0.38, decoY, W * 0.24, 2);

    // 英文副标题
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = s.textColor;
    ctx.font = 'italic 10px sans-serif';
    ctx.fillText('Motivational Quote by Meixiaoke', W / 2, decoY + 16);

    // 底部信息
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = s.textColor;
    ctx.font = '9px sans-serif';
    ctx.fillText('\u9759\u83b1\u7f8e \u00b7 AI\u8425\u9500\u6d77\u62a5', W / 2, H * 0.97);
  },


  // ================================================================
  //  风格3：国潮新中式 — 水墨山水 + 竹月 + 印章
  // ================================================================
  _drawChinese(ctx, W, H, text) {
    const s = STYLE_SCHEMES.chinese;

    // 宣纸底色
    ctx.fillStyle = s.paperColor;
    ctx.fillRect(0, 0, W, H);

    // 宣纸纹理噪点（随机浅墨点）
    for (let i = 0; i < 200; i++) {
      ctx.globalAlpha = 0.02 + Math.random() * 0.03;
      ctx.fillStyle = Math.random() > 0.5 ? '#8B7355' : '#A08060';
      const nx = Math.random() * W;
      const ny = Math.random() * H;
      ctx.fillRect(nx, ny, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    // ---- 顶部天空留白渐淡 ----
    const topFade = ctx.createLinearGradient(0, 0, 0, H * 0.3);
    topFade.addColorStop(0, 'rgba(245,240,232,0)');
    topFade.addColorStop(1, 'rgba(245,240,232,0.3)');
    ctx.fillStyle = topFade;
    ctx.fillRect(0, 0, W, H * 0.3);

    // ---- 月亮 ----
    const moonX = W * 0.78;
    const moonY = H * 0.14;
    const moonR = W * 0.075;
    // 月晕
    for (let g = 3; g > 0; g--) {
      const mg = ctx.createRadialGradient(moonX, moonY, moonR, moonX, moonY, moonR + g * 15);
      mg.addColorStop(0, 'rgba(255,250,230,' + (0.08 / g) + ')');
      mg.addColorStop(1, 'rgba(255,250,230,0)');
      ctx.fillStyle = mg;
      ctx.beginPath();
      ctx.arc(moonX, moonY, moonR + g * 15, 0, Math.PI * 2);
      ctx.fill();
    }
    // 月本体
    ctx.fillStyle = 'rgba(250,245,225,0.92)';
    ctx.beginPath();
    ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
    ctx.fill();

    // ---- 远山（水墨风格）----
    const drawInkMountain = (baseY, heightRange, alpha, offsetX) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      // 用多层叠加模拟水墨晕染
      for (let layer = 0; layer < 3; layer++) {
        const ly = baseY + layer * 3;
        const lh = heightRange * (1 - layer * 0.2);
        ctx.fillStyle = layer === 0 ? '#2C2416' : layer === 1 ? '#3D3224' : '#4A3D2E';
        ctx.beginPath();
        ctx.moveTo(-20, ly + 30);
        const peaks = 5;
        let px = -20;
        const seed = offsetX + layer * 100;
        for (let p = 0; p <= peaks; p++) {
          px += (W + 40) / peaks;
          const ph = lh * (0.4 + Math.sin(p * 1.5 + seed) * 0.3 + Math.cos(p * 0.7) * 0.3);
          // 山顶圆润
          ctx.lineTo(px, ly - ph);
        }
        ctx.lineTo(W + 20, ly + 30);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };
    drawInkMountain(H * 0.42, H * 0.22, 0.35, 0);       // 最远
    drawInkMountain(H * 0.48, H * 0.17, 0.5, W * 0.05);  // 中间
    drawInkMountain(H * 0.54, H * 0.13, 0.68, -W * 0.03); // 最近

    // ---- 竹叶（左上角几枝）----
    const drawBambooLeaf = (bx, by, len, angle, width) => {
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(angle);
      ctx.fillStyle = 'rgba(34,60,34,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(len * 0.4, -width * 0.5, len, 0);
      ctx.quadraticCurveTo(len * 0.4, width * 0.5, 0, 0);
      ctx.fill();
      // 叶脉
      ctx.strokeStyle = 'rgba(20,45,20,0.25)';
      ctx.lineWidth = 0.3;
      ctx.beginPath();
      ctx.moveTo(1, 0);
      ctx.lineTo(len - 2, 0);
      ctx.stroke();
      ctx.restore();
    };
    // 竹枝1
    const b1x = W * 0.06, b1y = H * 0.08;
    drawBambooLeaf(b1x, b1y, 30, 0.3, 4);
    drawBambooLeaf(b1x + 18, b1y + 12, 25, 0.6, 3.5);
    drawBambooLeaf(b1x + 8, b1y + 20, 22, -0.2, 3);
    drawBambooLeaf(b1x + 25, b1y + 22, 18, 0.8, 3);
    // 竹枝2
    drawBambooLeaf(W * 0.02, H * 0.16, 28, 0.5, 3.5);
    drawBambooLeaf(W * 0.14, H * 0.12, 20, 0.1, 3);

    // ---- 水面/云雾（底部留白）----
    const mistGrad = ctx.createLinearGradient(0, H * 0.6, 0, H * 0.82);
    mistGrad.addColorStop(0, 'rgba(245,240,232,0)');
    mistGrad.addColorStop(0.5, 'rgba(245,240,232,0.6)');
    mistGrad.addColorStop(1, 'rgba(245,240,232,0.95)');
    ctx.fillStyle = mistGrad;
    ctx.fillRect(0, H * 0.6, W, H * 0.22);

    // 云雾笔触
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = '#8B7355';
    for (let c = 0; c < 6; c++) {
      const cx = W * (0.1 + c * 0.16);
      const cy = H * (0.64 + Math.sin(c * 2) * 0.04);
      const cr = 25 + Math.random() * 35;
      ctx.beginPath();
      ctx.ellipse(cx, cy, cr, cr * 0.35, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // ---- 印章（右下角）----
    const sealX = W * 0.83;
    const sealY = H * 0.78;
    const sealSize = 36;
    // 印泥红底
    ctx.globalAlpha = 0.78;
    ctx.fillStyle = s.sealRed;
    this._roundRect(ctx, sealX, sealY, sealSize, sealSize, 3);
    // 印文（简化的"玫小可"）
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = s.paperColor;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u73ab', sealX + sealSize / 2, sealY + sealSize * 0.33);
    ctx.fillText('\u5c0f\u53ef', sealX + sealSize / 2, sealY + sealSize * 0.72);

    // ---- 主文案（书法风格位置）----
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = s.inkDark;
    ctx.font = 'bold 17px sans-serif';
    ctx.textAlign = 'center';

    const maxW = W * 0.6;
    const lines = this._wrapText(ctx, text, maxW);
    const lineH = 27;
    const startY = H * 0.56 - (lines.length * lineH) / 2;

    // 文字阴影（水墨扩散效果）
    ctx.shadowColor = 'rgba(139,115,85,0.15)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    lines.forEach((line, idx) => {
      ctx.fillText(line, W * 0.46, startY + idx * lineH);
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 竖排小字（左侧）
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = s.inkDark;
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';
    const chars = '\u9759\u83b1\u7f8e'.split(''); // 静莱美
    chars.forEach((ch, i) => {
      ctx.fillText(ch, W * 0.07, H * 0.38 + i * 14);
    });

    // 底部日期
    ctx.globalAlpha = 0.35;
    ctx.font = '8px sans-serif';
    const todayStr = (() => {
      const d = new Date();
      return d.getFullYear() + '.' +
        String(d.getMonth()+1).padStart(2,'0') + '.' +
        String(d.getDate()).padStart(2,'0');
    })();
    ctx.fillText(todayStr, W / 2, H * 0.97);
  },


  // ================================================================
  //  风格4：活力渐变 — 极光星河 + 光束 + 梦幻色彩
  // ================================================================
  _drawVibrant(ctx, W, H, text) {
    const s = STYLE_SCHEMES.vibrant;

    // ---- 深空背景渐变 ----
    const spaceGrad = ctx.createLinearGradient(0, 0, 0, H);
    spaceGrad.addColorStop(0, '#0a0a1a');
    spaceGrad.addColorStop(0.4, '#16163a');
    spaceGrad.addColorStop(0.7, '#1a103c');
    spaceGrad.addColorStop(1, '#0d0d20');
    ctx.fillStyle = spaceGrad;
    ctx.fillRect(0, 0, W, H);

    // ---- 极光效果（多层渐变弧形）----
    const drawAurora = (startY, endY, colorStops, waveOffset) => {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      for (let wv = 0; wv < 3; wv++) {
        const ag = ctx.createLinearGradient(0, startY, 0, endY);
        colorStops.forEach(cs => ag.addColorStop(cs.pos, cs.color));
        ctx.globalAlpha = 0.08 + wv * 0.03;
        ctx.fillStyle = ag;
        ctx.beginPath();
        ctx.moveTo(0, H);
        // 波浪形顶部
        for (let x = 0; x <= W; x += 5) {
          const y = startY + Math.sin((x + waveOffset + wv * 50) * 0.015) * 25 +
                    Math.cos((x + waveOffset) * 0.008) * 15;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(W, H);
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    };

    // 紫粉色极光带
    drawAurora(H * 0.12, H * 0.55, [
      { pos: 0, color: 'rgba(102,126,234,0)' },
      { pos: 0.3, color: 'rgba(147,51,234,0.5)' },
      { pos: 0.6, color: 'rgba(240,147,251,0.4)' },
      { pos: 1, color: 'rgba(240,147,251,0)' }
    ], 0);

    // 蓝绿色极光带
    drawAurora(H * 0.25, H * 0.65, [
      { pos: 0, color: 'rgba(16,185,129,0)' },
      { pos: 0.4, color: 'rgba(59,130,246,0.35)' },
      { pos: 0.7, color: 'rgba(99,102,241,0.25)' },
      { pos: 1, color: 'rgba(99,102,241,0)' }
    ], 120);

    ctx.globalCompositeOperation = 'source-over';

    // ---- 星空（密集闪烁）----
    for (let i = 0; i < 80; i++) {
      const sx = Math.random() * W;
      const sy = Math.random() * H * 0.7;
      const sr = 0.3 + Math.random() * 1.5;
      const sa = 0.2 + Math.random() * 0.8;
      // 彩色星星
      const hue = [240, 280, 320, 40, 200][Math.floor(Math.random() * 5)];
      ctx.globalAlpha = sa;
      ctx.fillStyle = `hsla(${hue},80%,80%,${sa})`;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
      // 大星十字光芒
      if (sr > 1) {
        ctx.globalAlpha = sa * 0.25;
        ctx.fillRect(sx - sr * 3, sy - 0.3, sr * 6, 0.6);
        ctx.fillRect(sx - 0.3, sy - sr * 3, 0.6, sr * 6);
      }
    }
    ctx.globalAlpha = 1;

    // ---- 流星（2颗）----
    const drawMeteor = (mx, my, len, angle) => {
      ctx.save();
      ctx.translate(mx, my);
      ctx.rotate(angle);
      const mg = ctx.createLinearGradient(0, 0, len, 0);
      mg.addColorStop(0, 'rgba(255,255,255,0)');
      mg.addColorStop(0.3, 'rgba(255,255,255,0.7)');
      mg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = mg;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(len, 0);
      ctx.stroke();
      // 流星头
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(0, 0, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };
    drawMeteor(W * 0.7, H * 0.1, 35, 0.7);
    drawMeteor(W * 0.3, H * 0.18, 25, 0.6);

    // ---- 底部光晕球体 ----
    const glowConfigs = [
      { x: W * 0.2, y: H * 0.78, r: 80, color: 'rgba(102,126,234,0.12)' },
      { x: W * 0.8, y: H * 0.82, r: 90, color: 'rgba(240,87,108,0.1)' },
      { x: W * 0.5, y: H * 0.9, r: 100, color: 'rgba(255,216,155,0.08)' }
    ];
    glowConfigs.forEach(g => {
      const gg = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
      gg.addColorStop(0, g.color);
      gg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gg;
      ctx.fillRect(0, 0, W, H);
    });

    // ---- 文案区域 ----
    // 半透明玻璃态卡片
    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = '#FFF';
    this._roundRect(ctx, W * 0.06, H * 0.62, W * 0.88, H * 0.3, 16);
    ctx.restore();

    // 卡片边框微光
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 1;
    this._strokeRoundRect(ctx, W * 0.06, H * 0.62, W * 0.88, H * 0.3, 16);

    // 渐变标题文字
    const titleGrad = ctx.createLinearGradient(W * 0.3, 0, W * 0.7, 0);
    titleGrad.addColorStop(0, '#f093fb');
    titleGrad.addColorStop(0.5, '#FFE066');
    titleGrad.addColorStop(1, '#f5576c');
    ctx.globalAlpha = 0.9;
    ctx.fillStyle = titleGrad;
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('\u2728 \u73ab\u5c0f\u53ef \u00b7 \u6bcf\u65e5\u91d1\u53e5 \u2728', W / 2, H * 0.655);

    // 主文案（白色）
    ctx.globalAlpha = 1;
    ctx.fillStyle = s.textColor;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(240,147,251,0.3)';
    ctx.shadowBlur = 8;
    const maxW = W * 0.8;
    const lines = this._wrapText(ctx, text, maxW);
    const lineH = 25;
    const startY = H * 0.69;
    lines.forEach((line, idx) => {
      ctx.fillText(line, W / 2, startY + idx * lineH);
    });
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    // 底部品牌
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = s.textColor;
    ctx.font = '9px sans-serif';
    ctx.fillText('\u2014 \u9759\u83b1\u7f8e \u00b7 AI\u8425\u9500\u6d77\u62a5 \u2014', W / 2, H * 0.965);
  },


  // ==================== 工具函数 ====================

  /** 圆角矩形填充 */
  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  },

  /** 圆角矩形描边 */
  _strokeRoundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y +h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.stroke();
  },

  /** 文字自动换行 */
  _wrapText(ctx, text, maxWidth) {
    const chars = text.split('');
    const lines = [];
    let curLine = '';

    for (const ch of chars) {
      const test = curLine + ch;
      const m = ctx.measureText(test);
      if (m.width > maxWidth && curLine.length > 0) {
        lines.push(curLine);
        curLine = ch;
      } else {
        curLine = test;
      }
    }
    if (curLine) lines.push(curLine);
    return lines;
  },


  // ==================== 预览与保存 ====================

  closePreview() {
    this.setData({ showPreview: false });
  },

  previewImage() {
    if (!this.data.generatedImage) return;
    wx.previewImage({
      urls: [this.data.generatedImage],
      current: this.data.generatedImage
    });
  },

  saveToAlbum() {
    if (!this.data.generatedImage) return;

    wx.showLoading({ title: '保存中...', mask: true });

    wx.saveImageToPhotosAlbum({
      filePath: this.data.generatedImage,
      success: () => {
        wx.hideLoading();
        wx.showToast({ title: '\u5df2\u4fdd\u5b58\u5230\u76f8\u518c \u2705', icon: 'success' });
      },
      fail: (e) => {
        wx.hideLoading();
        if (String(e.errMsg).includes('auth deny') || String(e.errMsg).includes('authorize')) {
          wx.showModal({
            title: '\u9700\u8981\u76f8\u518c\u6743\u9650',
            content: '\u8bf7\u5141\u8bb8\u8bbf\u95ee\u76f8\u518c\u4ee5\u4fdd\u5b58\u6d77\u62a5',
            confirmText: '\u53bb\u8bbe\u7f6e',
            success: (m) => { if (m.confirm) wx.openSetting(); }
          });
        } else {
          wx.showToast({ title: '\u4fdd\u5b58\u5931\u8d25', icon: 'none' });
        }
      }
    });
  },

  onShareAppMessage() {
    const text = this.data.customText || (this.data.currentQuote ? this.data.currentQuote.text : '');
    const shortTitle = text ? text.split('\uff0e')[0].split('\u3002')[0] : '\u73ab\u5c0f\u53ef \u00b7 AI\u8425\u9500\u6d77\u62a5';
    return {
      title: shortTitle.length > 16 ? shortTitle.substring(0, 16) + '...' : shortTitle,
      path: '/pages/poster/poster',
      imageUrl: this.data.generatedImage || ''
    };
  }
});
