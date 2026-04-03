# Open Interview 界面设计 Review

> 审阅日期：2026-04-02
> 审阅范围：全局样式、组件库、Shell 布局、7 个功能页面
> 参考依据：ui-ux-pro-max skill（design-system generator + UX guidelines + typography/chart databases）

---

## 总体印象

当前设计走的是「克制工具型」路线 — IBM Plex 字体、深蓝侧边栏、浅灰背景、白色卡片。功能性没问题，但整体给人一种**内部管理后台 / admin dashboard** 的感觉，而不像一个面向个人的面试训练产品。对于一个需要用户长期投入、自我驱动的学习工具来说，缺少情感温度和视觉节奏。

**推荐设计方向**：Flat Design（2D、极简、干净线条、typography-focused、icon-heavy），保持当前的高性能和 WCAG 可访问性优势，但在色彩、字体和交互细节上做有温度的升级。

---

## 1. 视觉单调 — 每页都是同一套模板

**问题**：7 个页面的视觉结构几乎相同：

```
PageHeader（badge + title + buttons）
  ↓
DetailGrid（4 个灰色统计小卡片）
  ↓
两栏布局（SurfaceCard + SurfaceCard）
```

导入、题库、面经、QA、练习、简历 — 全是这个节奏。用户在页面之间切换时感知不到「我到了一个不同的地方」。

**建议**：

- 为不同功能区定义**视觉变体**。比如练习/考试页可以有更紧凑、更聚焦的布局（像考试界面，而不是 dashboard）；QA 页可以更像聊天界面；导入页可以用更直接的 progressive disclosure（注意：避免复杂的 wizard/多步 onboarding，这是 Flat Design 的 anti-pattern）
- DetailGrid 不需要在每个页面都出现。它适合数据概览，但在练习和 QA 场景中，用户关心的不是统计数字而是**下一步动作**
- PageHeader 的 `eyebrow badge + title` 组合可以更灵活 — 有些页面可以用更大的 hero section，有些可以更紧凑

---

## 2. 色彩方案过于保守

**问题**：整个调色板是标准 corporate blue-gray：

```css
--background: #eff3f6;     /* 冷灰 */
--accent: #1d4ed8;         /* 标准蓝 */
--surface-strong: #ffffff;  /* 白 */
--surface-nav: #0f172a;     /* 深蓝黑 */
```

只有一个 accent 色，没有暖色点缀，没有渐变，没有层次。这是 Tailwind 默认 slate 调色板的直接映射。

**建议**：

- 引入一个**辅助 accent 色**用于区分功能模块。推荐配色方案（来自 skill design-system）：

  | 角色 | 当前值 | 推荐值 | 说明 |
  |------|--------|--------|------|
  | Primary | `#1d4ed8` (蓝) | `#6366F1` (Indigo) | 更有个性，区分于标准企业蓝 |
  | CTA / Success | `#0f766e` (teal) | `#10B981` (Emerald) | 更明亮、更有行动感 |
  | Background | `#eff3f6` (冷灰) | `#F5F3FF` (暖紫灰) | 带一点紫调让界面更温暖 |
  | Text | `#0f172a` | `#1E1B4B` (Indigo-950) | 与 indigo 主色调和谐 |
  | Secondary | - | `#818CF8` (Indigo-400) | 用于次级按钮、hover 态 |

- 给 PageHeader 或关键 CTA 区域加**微妙渐变**。导入页的 onboarding banner 已经用了 `linear-gradient(135deg, rgba(219,234,254,0.75), ...)` — 这是整个应用里唯一有视觉温度的地方，可以把这个手法推广
- Flat Design 风格下不追求 shadow 层级，但可以通过**颜色层次**和**边框粗细**来区分卡片权重

---

## 3. 排版层次不够鲜明

**问题**：

- 只用了 IBM Plex Sans 的 400/500/600 三个字重，缺少 700（bold）在标题上的冲击力
- 页面标题（`text-2xl font-semibold`）和内容文字之间的大小跳跃不够大
- 所有的 SectionHeading 看起来都一样大小、一样重要，没有优先级区分
- Badge 组件（11px uppercase monospace tracking）被过度使用 — 统计标签、状态标签、分类标签、空状态标签全用同一个样子

**建议**：

- 引入 IBM Plex Sans **700** 字重，用于页面主标题和关键数字
- 拉大标题到正文的尺寸比例。目前 PageHeader title 是 `text-2xl`(24px)，SectionHeading 是 `text-base`(16px) — 可以把 PageHeader 拉到 `text-3xl`(30px) 或更大
- 给关键统计数字（比如总分、题库量）使用更大字号 + bold，让数据有 **hero number** 的感觉，而不是都塞在 DetailGrid 的小灰卡片里
- 减少 Badge 的使用频率，或者给 Badge 更多视觉变体（比如 icon badge、dot badge、outline badge）

**字体替代方案**（来自 skill typography 数据库）：

| 方案 | Heading | Body | 风格 | 适合场景 |
|------|---------|------|------|----------|
| 方案 A（推荐） | JetBrains Mono | IBM Plex Sans | 开发者、精确、功能性 | 保留当前 body font，替换 mono 为更有特色的 JetBrains Mono |
| 方案 B | Fira Code | Fira Sans | dashboard、数据、分析 | Fira 家族一致性，Code 用于数据标签，Sans 用于正文 |
| 方案 C | Outfit | Work Sans | 几何、现代、当代 | 如果想要更活泼的方向，Outfit 标题更有辨识度 |

当前 IBM Plex Sans + IBM Plex Mono 属于 "Developer Mono" 类别，风格偏 functional/hacker。保留 IBM Plex Sans 作为 body font 是合理的，但可以考虑将 mono font 从 IBM Plex Mono 换成 **JetBrains Mono**（更锐利、更有代码感），标题关键数据用 mono + bold 展示。

---

## 4. 卡片设计缺少层次和深度

**问题**：

```tsx
// 当前 SurfaceCard — 只有两种状态
"rounded-2xl border p-5 shadow-sm"
// strong: 白 + 实线边框
// muted: 浅灰 + 浅边框
```

所有的内容容器视觉权重完全一样。嵌套时（SurfaceCard 里面再套 SurfaceCard muted）边界感模糊。

**建议**：

- 引入**卡片层级**：primary card（白底 + 实线边框）、secondary card（灰底 + 浅边框）、interactive card（hover 时颜色/边框变化）
- 给可点击的卡片加 `hover:border-accent transition-colors duration-200 cursor-pointer` — 在 Flat Design 风格下用**颜色转换**而非 shadow 提升来表达交互性
- **重要**：所有可点击卡片必须加 `cursor-pointer`（当前代码中 Link 包裹的卡片缺少此属性，这是常见的可用性问题）
- 关键操作区（如 QA 提问框、考试作答区）可以用更醒目的边框颜色（如 primary indigo 色边框）来突出

---

## 5. 交互反馈和动效缺失

**问题**：

- 整个应用没有任何动画 — 没有页面切换过渡、没有卡片出场动画、没有 loading 骨架屏
- 按钮只有 `transition-colors`，没有 press 反馈
- 考试提交"评分中..."只是文字变化，没有 loading spinner
- 雷达图是静态 SVG，没有绘制动画

**建议**：

- 给列表项添加 `stagger animation`（依次出场）— 可以用 CSS `@keyframes` + `animation-delay` 实现，不需要额外库
- 按钮加 `active:scale-[0.98]` 给点按压反馈
- Loading 状态用 **skeleton screen**（`animate-pulse` 占位骨架）替代空白等待，这是 Flat Design 下的标准加载模式
- 雷达图加入 `stroke-dasharray` + `stroke-dashoffset` 的绘制动画，让多边形「画出来」而不是直接出现
- 考虑给 SurfaceCard 加 `@starting-style` 或简单 fade-in

**动效时间规范**（来自 skill UX guidelines）：

| 类型 | 推荐时长 | 缓动函数 |
|------|----------|----------|
| 微交互（hover、focus、press） | 150-200ms | ease |
| 内容切换（tab、accordion） | 200-300ms | ease-out |
| 入场动画（fade-in、slide-in） | 200-300ms | ease-out |
| Loading spinner | 持续旋转 | linear |

**关键**：所有动画必须添加 `prefers-reduced-motion` 守卫：

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. 侧边栏设计可以更有品牌感

**问题**：

- 当前侧边栏是纯深蓝底 + 白色文字 + 简单 rounded 项目列表
- 没有 icon — 7 个导航项全是纯文字，快速扫描时辨识度低
- 品牌区域（"Open Interview 工作台"）和导航项之间的视觉区隔只是一条 `border-white/10`

**建议**：

- 为每个导航项加一个**简单 SVG icon**（推荐 Lucide icon set，不要用 emoji）。面试工具的隐喻丰富：导入=Upload、题库=BookOpen、练习=Zap、面经=MessageSquare、QA=Search、简历=FileText、审核=ClipboardCheck
- Active 状态可以更醒目 — 除了背景色变化，可以加左侧竖条（`border-l-2 border-accent`）或 icon 高亮
- 品牌区域可以加一个小 logo/mark 或特征图形，建立视觉锚点

---

## 7. 空状态和 Onboarding 可以更有温度

**问题**：

```tsx
// 当前空状态
<div className="rounded-xl border border-dashed ...">
  <Badge>空状态</Badge>
  <h3>标题</h3>
  <p>描述</p>
</div>
```

功能正确但情感为零。一个面试准备工具的空状态应该让人**想要开始**，而不是只告诉你「这里是空的」。

**建议**：

- 空状态加一个简单的 illustration 或 icon（不需要复杂插画，一个 64px 的线性图标就足够）
- 文案可以更鼓励性 — 从「还没有考试记录」改为「完成你的第一场模拟考试」
- CTA button 直接放在空状态里（有些地方已经做了 bullets 提示，但没有直接的 action button）

---

## 8. 数据展示方式可以更丰富

**问题**：

- DetailGrid 是唯一的数据展示方式 — 4 个灰色小格子，每个格子里 11px 大写标签 + 14px 数值
- 考试分数、练习进度等关键数据没有视觉化表现
- 题库表格是传统 HTML table，密度高但没有 highlight

**建议**：

- 关键指标用**大字号 hero 数字**展示（比如考试总分 `text-4xl font-bold`），而不是塞在 DetailGrid 里
- 练习进度可以加简单的 **progress bar**
- 维度分数可以加 **horizontal bar chart**（推荐 Recharts 或 Chart.js）而不是只用文字
- 考试题目列表可以用 score 驱动的**颜色条**（绿/黄/红）快速传达每题表现

**雷达图改进**（来自 skill chart 数据库）：

- 当前雷达图用于 multi-variable comparison，图表类型选择正确
- **限制 5-8 个轴**（当前 6 维，在合理范围内）
- 颜色规范：单数据集用 `#6366F1`（推荐 primary）+ 20% fill opacity；如果叠加多个数据集，使用 distinct colors
- **Accessibility**：雷达图可访问性评级为「中等」，必须在图表下方提供**数据表格替代**（当前代码的 grid dimensions 列表部分已满足，但缺少 `aria-` 标注）

---

## 9. 可访问性审计（新增）

**当前缺失的 CRITICAL 项**（来自 skill UX guidelines Priority 1-2）：

| 问题 | 严重性 | 当前状态 | 修复建议 |
|------|--------|----------|----------|
| `cursor-pointer` 缺失 | HIGH | 可点击卡片（Link 包裹的 div）没有 cursor-pointer | 所有 clickable element 加 `cursor-pointer` |
| Focus ring 不一致 | HIGH | Button 有 `focus-visible:outline`，但 Link-card 缺少 | 统一加 `focus-visible:ring-2 focus-visible:ring-primary` |
| `prefers-reduced-motion` | MEDIUM | 当前无动画所以暂时不是问题，但加动画后必须守卫 | 在 globals.css 加 reduced-motion media query |
| 触控目标尺寸 | MEDIUM | Badge 和小按钮可能不足 44x44px | 确保所有可交互元素最小 44x44px touch target |
| 表格 caption/header | LOW | 题库表格缺少 `<caption>` | 为数据表格加 `<caption>` 描述 |
| 图表替代文本 | LOW | 雷达图 SVG 有 `aria-label`，但缺少数据表格替代的 `aria-` 关联 | 用 `aria-describedby` 关联下方数据列表 |

**颜色对比度检查**：

| 组合 | 当前比值（约） | WCAG AA (4.5:1) | 状态 |
|------|----------------|-----------------|------|
| `--text-strong` (#0f172a) on `--background` (#eff3f6) | ~14:1 | PASS | OK |
| `--text-muted` (#566476) on `--surface-strong` (#fff) | ~5.2:1 | PASS | OK |
| `--text-muted` (#566476) on `--surface-muted` (#f7f9fb) | ~4.7:1 | PASS（边缘） | 注意 |
| Badge text (`--accent` #1d4ed8) on `--accent-soft` (#dbeafe) | ~4.8:1 | PASS | OK |
| 侧边栏 `text-slate-400` on `--surface-nav` (#0f172a) | ~5.4:1 | PASS | OK |

颜色对比度整体达标，但 `--text-muted` on `--surface-muted` 接近底线，如果调整背景色需要重新验证。

---

## 快速改进优先级

| 优先级 | 改动 | 影响 | 工作量 |
|--------|------|------|--------|
| P0 | 全局加 `cursor-pointer` 到可点击元素 | 基本可用性修复 | 极小 |
| P0 | 导航加 Lucide SVG icon | 辨识度大幅提升 | 小 |
| P0 | 按钮加 `active:scale-[0.98]` | 交互手感立刻改善 | 极小 |
| P0 | 统一 focus-visible ring 样式 | 键盘可访问性 | 小 |
| P1 | 切换配色方案到 Indigo + Emerald | 打破蓝灰单调，建立品牌感 | 中 |
| P1 | 可点击卡片加 hover border + transition | 层次感增加 | 极小 |
| P1 | 关键数字用 hero number 样式 | 数据更有冲击力 | 小 |
| P1 | 减少 DetailGrid 滥用 | 页面节奏更有变化 | 中 |
| P2 | 空状态加 SVG icon + 正面引导文案 | 用户情感体验 | 小 |
| P2 | Loading 状态改为 skeleton screen | 等待体验提升 | 小 |
| P2 | 加 `prefers-reduced-motion` 守卫 | Accessibility 合规 | 极小 |
| P2 | 列表项 stagger 出场动画（150-300ms） | 质感提升 | 小 |
| P2 | 雷达图绘制动画 + aria-describedby | 数据展示 + 可访问性 | 小 |
| P3 | 字体升级（JetBrains Mono 替换 Plex Mono） | 视觉个性 | 小 |
| P3 | 重新审视各页面的布局差异化 | 去掉模板感 | 大 |

---

## 实施前 Checklist

来自 skill pre-delivery checklist，适配当前项目：

### 视觉质量
- [ ] 不使用 emoji 作为 icon（使用 Lucide SVG icon set）
- [ ] 所有 icon 来自同一套 icon set，尺寸统一（建议 w-5 h-5 / 20px）
- [ ] Hover 状态不引起 layout shift（用 color/opacity 变化，不用 scale）
- [ ] 使用语义化 token（bg-primary）而非硬编码值

### 交互
- [ ] 所有可点击元素有 `cursor-pointer`
- [ ] Hover 状态提供清晰视觉反馈（150-300ms transition）
- [ ] Focus 状态对键盘用户可见（`focus-visible:ring-2`）
- [ ] 异步操作期间按钮 disabled + 显示 loading 状态

### 可访问性
- [ ] 正文对比度 ≥ 4.5:1（WCAG AA）
- [ ] 颜色不作为唯一信息传达方式
- [ ] `prefers-reduced-motion` 被尊重
- [ ] 图表提供数据表格替代
- [ ] 表单 input 有关联 label

### 响应式
- [ ] 在 375px / 768px / 1024px / 1440px 下正常显示
- [ ] 移动端无水平滚动
- [ ] 触控目标最小 44x44px

---

## 总结

当前设计的**结构骨架是好的**（语义化 token、响应式布局、组件复用），但「皮肤」太素了 — 缺少色彩层次、排版张力、交互反馈和品牌性格。对于一个面试训练产品，需要的不是更多功能区块，而是让用户觉得「这个工具有品质、用起来有动力」的那一层视觉打磨。

推荐的升级路径：**Flat Design + Indigo/Emerald 配色 + JetBrains Mono + Lucide icon + skeleton loading + reduced-motion 守卫**。保持当前的极简骨架，不加 shadow/glassmorphism 等重装饰，通过色彩、字体和微交互来建立产品个性。

---

## 附录 A：globals.css 改造参考

以下是推荐的 token 变更，可直接用于 `src/app/globals.css`。

### 字体引入变更

```css
/* 替换 */
@import "@fontsource/ibm-plex-mono/400.css";
/* 为 */
@import "@fontsource/jetbrains-mono/400.css";
@import "@fontsource/jetbrains-mono/500.css";
@import "@fontsource/jetbrains-mono/700.css";

/* 新增 700 字重 */
@import "@fontsource/ibm-plex-sans/700.css";
```

### 色彩 token 变更

```css
:root {
  --font-sans: "IBM Plex Sans", "Segoe UI", sans-serif;
  --font-mono: "JetBrains Mono", "SFMono-Regular", monospace;  /* 替换 IBM Plex Mono */

  --background: #F5F3FF;          /* 暖紫灰，替代 #eff3f6 */
  --surface-strong: #ffffff;
  --surface-muted: #FAF9FE;       /* 配合紫调背景的浅色，替代 #f7f9fb */
  --surface-nav: #1E1B4B;         /* Indigo-950，替代 #0f172a */
  --surface-nav-muted: #312E81;   /* Indigo-800，替代 #162237 */
  --border-strong: #E0DEF7;       /* 带紫调的边框，替代 #d8e1ea */
  --border-muted: #EBE9FC;        /* 带紫调的浅边框，替代 #e7edf3 */
  --text-strong: #1E1B4B;         /* Indigo-950，替代 #0f172a */
  --text-muted: #6366F1B3;        /* Indigo-500 at 70% opacity，替代 #566476 */
  --text-inverse: #f8fafc;
  --accent: #6366F1;              /* Indigo-500，替代 #1d4ed8 */
  --accent-soft: #EEF2FF;         /* Indigo-50，替代 #dbeafe */
  --accent-secondary: #818CF8;    /* Indigo-400，新增 */
  --success: #10B981;             /* Emerald-500，替代 #0f766e */
  --success-soft: #D1FAE5;        /* Emerald-100，新增 */
  --warning: #F59E0B;             /* Amber-500，替代 #b45309 */
}
```

> **注意**：`--text-muted` 使用 opacity 值需要验证对比度。如果对比度不足，改用实色 `#6B7280`（Gray-500）作为 fallback。

### 新增全局样式

```css
/* Reduced motion 守卫 */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Stagger 入场动画 */
@keyframes fade-in-up {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Skeleton pulse（与 Tailwind animate-pulse 配合） */
@keyframes skeleton-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}
```

### @theme inline 需同步更新

```css
@theme inline {
  /* ... 原有映射 ... */
  --color-accent-secondary: var(--accent-secondary);
  --color-success-soft: var(--success-soft);
}
```

---

## 附录 B：组件改造参考

### Button — 加按压反馈和 focus ring

```diff
// src/components/ui/button.tsx — buttonClasses 函数
- "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-60"
+ "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-medium transition-colors duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60"
```

### SurfaceCard — 可点击变体

```tsx
// 新增 interactive prop
type SurfaceCardProps = React.HTMLAttributes<HTMLDivElement> & {
  muted?: boolean;
  interactive?: boolean;  // 新增
};

// interactive 时的额外样式
interactive
  ? "cursor-pointer transition-colors duration-200 hover:border-accent"
  : ""
```

### 侧边栏 Icon 映射

```tsx
// src/features/workbench/route-definitions.ts
import {
  Upload, ClipboardCheck, BookOpen, Zap,
  MessageSquare, Search, FileText,
} from "lucide-react";

// 每个 NavItem 新增 icon 字段
{ label: "导入",     icon: Upload,         href: "/import",     ... },
{ label: "审核队列", icon: ClipboardCheck,  href: "/review",     ... },
{ label: "题库",     icon: BookOpen,        href: "/questions",  ... },
{ label: "随机练习", icon: Zap,             href: "/practice",   ... },
{ label: "面经",     icon: MessageSquare,   href: "/interviews", ... },
{ label: "AI 问答",  icon: Search,          href: "/qa",         ... },
{ label: "简历/项目", icon: FileText,       href: "/resume",     ... },
```

```tsx
// app-sidebar.tsx 中使用
<item.icon className="h-5 w-5 shrink-0" />
<span className="text-sm font-semibold">{item.label}</span>
```

### EmptyList — 加 icon 和 CTA

```tsx
// src/components/workbench/empty-list.tsx
type EmptyListProps = {
  title: string;
  description?: string;
  bullets?: string[];
  icon?: React.ComponentType<{ className?: string }>;  // 新增
  action?: { label: string; href: string };             // 新增
};

// 渲染中加入
{icon ? <Icon className="h-12 w-12 text-accent opacity-40" /> : null}
// ...
{action ? <Button href={action.href} variant="primary">{action.label}</Button> : null}
```

### Skeleton 组件（新建）

```tsx
// src/components/ui/skeleton.tsx
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-lg bg-border-muted",
        className,
      )}
    />
  );
}

// 使用示例：卡片骨架
<div className="space-y-3">
  <Skeleton className="h-5 w-3/4" />
  <Skeleton className="h-4 w-1/2" />
  <Skeleton className="h-32 w-full" />
</div>
```

---

## 附录 C：页面布局差异化建议

不需要全部重做，但以下三个页面值得优先调整布局节奏：

### 练习页 `/practice`

当前：PageHeader → DetailGrid → 两栏（说明+画像 | 练习区）

建议：去掉 DetailGrid，将关键数据（题库量、可评分题）用 hero number 内嵌到 PageHeader 区域。练习区全宽，减少认知负担。考试作答中隐藏侧边画像面板。

### QA 页 `/qa`

当前：PageHeader → DetailGrid → 两栏（提问 | 最近会话）

建议：去掉 DetailGrid。提问区用更宽的单栏布局，类似聊天界面的输入区。最近会话收到侧边或底部。

### 导入页 `/import`

当前已有 onboarding banner，结构尚可。建议：首次使用时 banner 更突出（比如占据更多纵向空间），已有数据后自动收起。
