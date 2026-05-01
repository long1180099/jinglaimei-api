# 静莱美管理系统 - UI设计系统

## 🎨 品牌色彩系统

### 主色调
**静莱美绿**: 代表自然、健康、成长
- `#00C896` - 主色 (Primary)
- `#00A67C` - 深色 (Primary Dark)
- `#00E5B0` - 浅色 (Primary Light)
- `#E6FFF7` - 超浅色 (Primary Lightest)

### 辅助色
**活力橙**: 代表活力、温暖、收益
- `#FF8A00` - 收益/成功色 (Success)
- `#FF6B00` - 深橙色 (Success Dark)
- `#FFAA40` - 浅橙色 (Success Light)

**警示红**: 代表警示、错误、重要
- `#FF4D4F` - 错误/警告色 (Error)
- `#FF1F20` - 深红色 (Error Dark)
- `#FF7875` - 浅红色 (Error Light)

**智慧蓝**: 代表冷静、专业、信息
- `#1890FF` - 信息/链接色 (Info)
- `#096DD9` - 深蓝色 (Info Dark)
- `#69C0FF` - 浅蓝色 (Info Light)

### 中性色调
**文本色**:
- `#262626` - 标题/主要文本 (Text Primary)
- `#595959` - 次要文本 (Text Secondary)
- `#8C8C8C` - 占位文本 (Text Disabled)

**背景色**:
- `#FFFFFF` - 白色背景 (Bg White)
- `#F5F5F5` - 页面背景 (Bg Page)
- `#FAFAFA` - 卡片背景 (Bg Card)
- `#F0F0F0` - 输入框背景 (Bg Input)
- `#E6E6E6` - 禁用背景 (Bg Disabled)

**边框色**:
- `#D9D9D9` - 默认边框 (Border Base)
- `#BFBFBF` - 强调边框 (Border Strong)
- `#F0F0F0` - 分割线 (Border Split)

## 🔤 字体系统

### 字体家族
- **中文**: "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif
- **英文/数字**: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
- **代码字体**: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace

### 字体层级
```css
/* 标题层级 */
--font-size-h1: 2.5rem;      /* 40px */
--font-size-h2: 2rem;        /* 32px */
--font-size-h3: 1.5rem;      /* 24px */
--font-size-h4: 1.25rem;     /* 20px */
--font-size-h5: 1rem;        /* 16px */

/* 正文层级 */
--font-size-base: 1rem;      /* 16px - 默认正文 */
--font-size-lg: 1.125rem;    /* 18px - 大号正文 */
--font-size-sm: 0.875rem;    /* 14px - 小号正文 */
--font-size-xs: 0.75rem;     /* 12px - 辅助文本 */

/* 行高规范 */
--line-height-tight: 1.2;    /* 标题行高 */
--line-height-base: 1.5;     /* 正文行高 */
--line-height-loose: 1.8;    /* 长文本行高 */
```

### 字重系统
- `400` - 常规 (Regular)
- `500` - 中等 (Medium)
- `600` - 半粗 (SemiBold)
- `700` - 粗体 (Bold)

## 📐 间距系统 (8px基准)

### 间距令牌
```css
/* 基础单位: 4px */
--spacing-1: 0.25rem;   /* 4px   */
--spacing-2: 0.5rem;    /* 8px   */
--spacing-3: 0.75rem;   /* 12px  */
--spacing-4: 1rem;      /* 16px  */
--spacing-5: 1.25rem;   /* 20px  */
--spacing-6: 1.5rem;    /* 24px  */
--spacing-8: 2rem;      /* 32px  */
--spacing-10: 2.5rem;   /* 40px  */
--spacing-12: 3rem;     /* 48px  */
--spacing-16: 4rem;     /* 64px  */
--spacing-20: 5rem;     /* 80px  */
--spacing-24: 6rem;     /* 96px  */
```

### 应用场景
- 内边距 (Padding): 使用 --spacing-2, --spacing-3, --spacing-4
- 外边距 (Margin): 使用 --spacing-4, --spacing-6, --spacing-8
- 组件间距: 使用 --spacing-3, --spacing-4
- 区块间距: 使用 --spacing-6, --spacing-8

## 🏗️ 布局系统

### 响应式断点
```css
/* 移动优先 */
--breakpoint-xs: 0;      /* 移动端 */
--breakpoint-sm: 576px;  /* 小屏 */
--breakpoint-md: 768px;  /* 平板 */
--breakpoint-lg: 992px;  /* 笔记本 */
--breakpoint-xl: 1200px; /* 桌面 */
--breakpoint-xxl: 1600px;/* 大屏 */
```

### 容器宽度
```css
--container-xs: 100%;
--container-sm: 540px;
--container-md: 720px;
--container-lg: 960px;
--container-xl: 1140px;
--container-xxl: 1320px;
```

## 🎭 组件设计规范

### 按钮 (Button)
```css
/* 尺寸 */
--button-height-lg: 48px;
--button-height-md: 40px;
--button-height-sm: 32px;
--button-height-xs: 24px;

/* 圆角 */
--border-radius-base: 6px;
--border-radius-lg: 8px;
--border-radius-sm: 4px;
--border-radius-circle: 50%;
```

### 卡片 (Card)
```css
/* 阴影系统 */
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);

/* 圆角 */
--card-radius: 12px;
--card-padding: var(--spacing-6);
```

### 表格 (Table)
```css
/* 表格设计 */
--table-header-bg: var(--bg-card);
--table-row-hover-bg: #fafafa;
--table-border-color: var(--border-base);
--table-padding-vertical: var(--spacing-3);
--table-padding-horizontal: var(--spacing-4);
```

## 🚀 动画与交互

### 过渡时间
```css
--transition-fast: 150ms;
--transition-normal: 300ms;
--transition-slow: 500ms;
```

### 缓动函数
```css
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
--ease-out: cubic-bezier(0, 0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0, 1, 1);
```

### 悬停效果
- 按钮: 背景色变深 10%，轻微上浮阴影
- 卡片: 轻微上浮，阴影加深
- 链接: 文字颜色变深，下划线动画

## 🌓 深色模式设计

### 深色模式配色
```css
[data-theme="dark"] {
  /* 背景色反转 */
  --bg-white: #1a1a1a;
  --bg-page: #141414;
  --bg-card: #262626;
  --bg-input: #434343;
  
  /* 文本色反转 */
  --text-primary: #f0f0f0;
  --text-secondary: #bfbfbf;
  --text-disabled: #8c8c8c;
  
  /* 边框色调整 */
  --border-base: #434343;
  --border-strong: #595959;
}
```

## 📱 移动端优化

### 触摸目标
- 最小触摸目标: 44px × 44px
- 按钮间距: ≥ 8px
- 字体大小: ≥ 16px (防止自动缩放)

### 手势支持
- 下拉刷新: 符合原生体验
- 左滑操作: 表格行操作
- 长按菜单: 上下文操作

## 🎯 设计原则

### 一致性原则
- 相同功能保持相同外观
- 相同交互保持相同反馈
- 相同层级保持相同视觉权重

### 层次性原则
- 信息层级清晰明确
- 视觉权重区分主次
- 操作流程自然流畅

### 可用性原则
- 关键操作一次点击可达
- 错误状态明确提示
- 加载状态良好反馈

### 美观性原则
- 色彩和谐，对比度适宜
- 布局均衡，呼吸感充足
- 动效自然，不干扰操作

---

**设计系统版本**: 1.0.0  
**创建日期**: 2026-03-25  
**适用范围**: 静莱美管理系统所有界面  
**维护团队**: UI设计团队