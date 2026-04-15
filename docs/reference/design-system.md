---
doc_type: reference
canonical_for: open-interview UI design system
status: complete
updated_at: 2026-04-15
source_of_truth: src/app/globals.css, src/components/ui/*, src/components/workbench/*
supersedes: docs/001-webui-refactor/design.md §§5-8（实施后以本文件为准）
---

# Open Interview 设计系统

本文件是 Open Interview Web UI 的**规范权威来源**（canonical reference）。所有 tokens、原子组件 API、按钮编排规则、深色模式消费方式均以本文件为准；实际取值与最终行为以 `src/app/globals.css` + `src/components/ui/*` + `src/components/workbench/*` 源码为底，本文件与源码发生不一致时，以源码为准并同步修订本文件。

本文件由 M1 `m1-infra` phase 产出（对应 `docs/001-webui-refactor/design.md §§5-8`）。M2 及未来所有 UI 改动消费此规范。

---

## 1. Tokens 速查

全部定义在 `src/app/globals.css`；浅色 `:root`（lines 8-50）+ 深色 `.dark`（lines 52-76）；Tailwind v4 `@theme inline` 映射（lines 78-110）把所有 token 转发为 Tailwind 工具类，可直接写 `bg-[color:var(--color-brand)]` 等。

### 1.1 颜色（功能色 6 槽 + soft 变体）

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--color-brand` | `#2563eb` | `#3b82f6` | 主 CTA、激活态、选中态、focus ring |
| `--color-brand-soft` | `#eff6ff` | `rgba(59, 130, 246, 0.12)` | Badge / chip 背景、subtle 激活态 |
| `--color-success` | `#059669` | `#10b981` | 已完成、状态正常 |
| `--color-success-soft` | `#ecfdf5` | `rgba(16, 185, 129, 0.14)` | Success Badge 背景 |
| `--color-warning` | `#d97706` | `#f59e0b` | 提醒但非错误 |
| `--color-warning-soft` | `#fffbeb` | `rgba(245, 158, 11, 0.14)` | Warning Badge 背景 |
| `--color-destructive` | `#dc2626` | `#ef4444` | 删除、危险操作 |
| `--color-destructive-soft` | `#fef2f2` | `rgba(239, 68, 68, 0.14)` | Destructive Badge 背景 |
| `--color-info` | `#0284c7` | `#38bdf8` | 中性信息提示 |
| `--color-info-soft` | `#f0f9ff` | `rgba(56, 189, 248, 0.14)` | Info Badge 背景 |

### 1.2 颜色（中性语义别名）

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--color-background` | `#fafafa` | `#09090b` | 页面底色、HTML 背景 |
| `--color-foreground` | `#09090b` | `#fafafa` | 主正文 |
| `--color-border` | `#e4e4e7` | `#27272a` | 默认 1px border |
| `--color-muted-foreground` | `#71717a` | `#a1a1aa` | 次要文字、label、meta |

### 1.3 表面层级（3 层）

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--color-surface` | `#ffffff` | `#18181b` | 默认卡片底 |
| `--color-surface-muted` | `#fafafa` | `#09090b` | 页面底色、sidebar、empty state |
| `--color-surface-subtle` | `#f4f4f5` | `#27272a` | 嵌套面板、skeleton、disabled 态 |

### 1.4 字体

| Token | 值 | 用途 |
|---|---|---|
| `--font-sans` | `"Inter", "PingFang SC", "Microsoft YaHei", sans-serif` | 全站默认正文 |
| `--font-mono` | `"JetBrains Mono", ui-monospace, SFMono-Regular, monospace` | 代码、table header、技术性 meta |

字号层级（来自 `design.md §5.3`，无单独 token，使用 Tailwind 工具类直接表达）：

| 角色 | size × weight × line-height | 示例 Tailwind |
|---|---|---|
| Page title | 16px / 600 / 1.4 | `text-base font-semibold` |
| Section heading | 14px / 600 / 1.4 | `text-[14px] font-semibold` |
| Body default | 13px / 400 / 1.55 | `text-[13px]` |
| Body small | 12px / 400 / 1.5 | `text-xs` |
| Caption / meta | 11px / 500 / 1.4 | `text-[11px] font-medium` |
| Number emphasis | 15-20px / 600 / 1.2 | `text-[15px] font-semibold` |

### 1.5 圆角（4 档）

| Token | 值 | 用途 |
|---|---|---|
| `--radius-sm` | `4px` | chip、tag、inline badge |
| `--radius-md` | `6px` | button、input、select、small card |
| `--radius-lg` | `10px` | card、panel、dialog |
| `--radius-full` | `999px` | avatar、pill badge |

### 1.6 阴影（overlay-only）

默认无阴影（用 border 区分层级，Linear 派风格）；阴影只用于 dropdown / popover / dialog。

| Token | 浅色 | 深色 | 用途 |
|---|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(0,0,0,0.04)` | `0 1px 2px rgba(0,0,0,0.3)` | 卡片微浮起（默认关闭） |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.06)` | `0 4px 12px rgba(0,0,0,0.4)` | popover、dropdown、tooltip |
| `--shadow-lg` | `0 16px 48px rgba(0,0,0,0.12)` | `0 16px 48px rgba(0,0,0,0.5)` | dialog、modal |

### 1.7 间距（沿用 Tailwind 4px scale，无自定义 token）

`1=4 / 2=8 / 3=12 / 4=16 / 5=20 / 6=24 / 8=32 / 10=40 / 12=48 / 16=64`。按密度策略使用：

- **Header 紧凑档**：`px-4 py-3`（16/12px）/ 按钮 `sm` 28px 高
- **Body 平衡档**：Row `px-4 py-2.5`（16/10px）/ Card `p-5`（20px）/ 卡片间距 `gap-4`（16px）~ `gap-6`（24px）

### 1.8 动效

| Token | 值 | 用途 |
|---|---|---|
| `--duration-base` | `150ms` | 统一 hover / focus / color 过渡 |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | 默认缓动 |
| `@keyframes skeleton-pulse` | `opacity 1 ↔ 0.42`，1.4s 循环 | 骨架屏；`prefers-reduced-motion` 下降为 0.01ms 静态 |

**砍掉**：`@keyframes fade-in-up` / `@keyframes radar-draw` / `.reveal-list > *` / `.interactive-card` 全局类已全部删除（M1 完成）。

---

## 2. 按钮规范

### 2.1 Variants × Sizes 矩阵

`Button` 组件（`src/components/ui/button.tsx`）支持 **5 variants × 4 sizes = 20 组合**，所有非 `link` 组合共享相同的几何盒模型（1px border 统一）：

|           | sm (28px) | md (34px, 默认) | lg (40px) | xl (46px) |
|---|---|---|---|---|
| **primary**     | 工具栏主 CTA | 表单 submit | 页面主 CTA | 空态独占 CTA |
| **secondary**   | 工具栏次动作 | Dialog footer | 次要页面动作 | — |
| **ghost**       | 工具栏三级 | Dialog footer cancel | — | — |
| **destructive** | — | Dialog 删除确认 | 页面删除 CTA | — |
| **link**（无盒） | inline 链接气质 | inline（默认） | inline | inline |

尺寸定义：`sm = h-7 / px-2.5 / text-xs`；`md = h-[34px] / px-3.5 / text-[13px]`；`lg = h-10 / px-4.5 / text-sm`；`xl = h-[46px] / px-6.5 / text-[15px]`。全部 `rounded-[var(--radius-md)] = 6px`。

### 2.2 几何对齐原理

所有非 `link` variant 统一 `1px border`（透明或同色），保证同一排按钮高度与盒模型严格一致（`design.md §6.3`）。源码证：

```ts
primary:     "border border-[color:var(--color-brand)] bg-[color:var(--color-brand)] text-white …"
secondary:   "border border-[color:var(--color-border)] bg-[color:var(--color-surface)] …"
ghost:       "border border-transparent bg-transparent …"
destructive: "border border-[color:var(--color-destructive)] bg-[color:var(--color-destructive)] text-white …"
link:        "text-[color:var(--color-brand)] underline-offset-4 hover:underline"
```

### 2.3 七条摆放规则（`design.md §6.4`）

1. **一个语境一个 Primary**：每个页面 / section / dialog 最多 1 个 Primary，其他动作降级为 Secondary / Ghost / Link。
2. **Primary 居右**：PageHeader 右上、Dialog footer 右端。
3. **Destructive 不与 Primary 并排**：只和 Ghost "取消" 成对出现。
4. **同组按钮 gap 6-8px**：`sm` 用 `gap-1.5`（6px），`md / lg` 用 `gap-2`（8px）；跨组用 margin 分隔。
5. **Icon-only 按钮**：正方形，边长 = 对应档位高度；**必须** `aria-label` + hover 展示 `Tooltip`（见 `src/components/ui/tooltip.tsx`）。
6. **空态 CTA**：主按钮用 `size="xl"` 独占一行居中（见 `EmptyList` 源码 line 50）；次级说明用 `link` 放在下面（不与主 CTA 横排）。
7. **Disabled** 统一 opacity 50%，不改 geometry（源码：`disabled:opacity-50`）。

### 2.4 典型用例

```tsx
// PageHeader 主 CTA（右对齐，Primary 唯一）
<PageHeader
  title="题库"
  actions={
    <>
      <Button href="/import" variant="secondary" size="sm">导入面经</Button>
      <Button href="/questions/new" variant="primary" size="sm">新建题目</Button>
    </>
  }
/>

// Dialog footer（Destructive + 取消配对）
<CardFooter>
  <Button variant="ghost" size="md" onClick={onCancel}>取消</Button>
  <Button variant="destructive" size="md" onClick={onConfirm}>删除</Button>
</CardFooter>

// 空态 CTA（xl 独占 + link 说明）
<EmptyList
  title="还没有面经"
  description="从简历或外部面经库导入你的第一份"
  icon={FileText}
  action={{ label: "导入面经", href: "/import" }}
/>

// Link variant（inline 链接气质，无盒）
<Button href="/docs" variant="link">查看说明</Button>
```

---

## 3. 组件清单

### 3.1 原子 UI（`src/components/ui/*`）

#### `Button`（`src/components/ui/button.tsx`）

- **props**：`variant?: "primary" | "secondary" | "ghost" | "destructive" | "link"` · `size?: "sm" | "md" | "lg" | "xl"` · 有 `href` 时走 `<Link>`，否则走 `<button type="button" />`
- **用例**：

```tsx
<Button variant="primary" size="md" onClick={handleSave}>保存</Button>
<Button href="/questions" variant="secondary" size="sm">返回题库</Button>
```

#### `Badge`（`src/components/ui/badge.tsx`）

- **props**：`tone?: "neutral" | "brand" | "accent" | "success" | "warning" | "destructive" | "info"`（`accent` = `brand` 别名）· `variant?: "solid" | "soft"`（默认 `soft`）
- **用例**：

```tsx
<Badge tone="success">已确认</Badge>
<Badge tone="warning" variant="solid">需复核</Badge>
```

#### `Card` / `CardHeader` / `CardBody` / `CardFooter`（`src/components/ui/card.tsx`）

- **props**：`Card` 接受 `muted?: boolean` 切换 `surface-muted` 底色；子组件接收 `React.HTMLAttributes<HTMLDivElement>`
- **用例**：

```tsx
<Card>
  <CardHeader>题目详情</CardHeader>
  <CardBody>{children}</CardBody>
  <CardFooter>
    <Button variant="primary" size="md">确认</Button>
  </CardFooter>
</Card>
```

#### `SurfaceCard`（`src/components/ui/surface-card.tsx`）

- **props**：`muted?: boolean` · `interactive?: boolean`（**@deprecated no-op**，旧签名保留向下兼容；hover 表达改走 `className`）
- **用例**：

```tsx
<SurfaceCard className="p-5">{children}</SurfaceCard>
```

#### `Dialog`（`src/components/ui/dialog.tsx`）

- **props**：`open: boolean` · `onOpenChange: (open: boolean) => void` · `labelledBy?: string` · `children`；内置 `Escape` 关闭 + body `overflow: hidden` + `createPortal` 到 `document.body`
- **用例**：

```tsx
<Dialog open={open} onOpenChange={setOpen} labelledBy="confirm-title">
  <div className="p-5">
    <h3 id="confirm-title" className="text-base font-semibold">确认删除</h3>
    <p className="mt-2 text-[13px] text-[color:var(--color-muted-foreground)]">此操作不可撤销</p>
  </div>
  <CardFooter>
    <Button variant="ghost" size="md" onClick={() => setOpen(false)}>取消</Button>
    <Button variant="destructive" size="md" onClick={handleDelete}>删除</Button>
  </CardFooter>
</Dialog>
```

#### `Tooltip`（`src/components/ui/tooltip.tsx`）

- **props**：`content: ReactNode` · `children: ReactElement`（包裹触发元素）· `side?: "top" | "right" | "bottom" | "left"`（默认 `top`）
- **用例**：

```tsx
<Tooltip content="折叠侧栏" side="right">
  <button aria-label="折叠侧栏" className="...">
    <ChevronLeft className="h-4 w-4" />
  </button>
</Tooltip>
```

#### `Input` / `Select` / `Textarea`（`src/components/ui/{input,select,textarea}.tsx`）

- **props**：标准 `HTMLInputElement` / `HTMLSelectElement` / `HTMLTextAreaElement` 属性全量透传；只接受 `className`；`Textarea` 带 `forwardRef`
- **尺寸**：`Input` / `Select` 固定 `h-10`；`Textarea` `min-h-[84px]`（≈ 3 行）；全部 `rounded-[var(--radius-md)]`、focus ring 用 `--color-brand`
- **用例**：

```tsx
<FormField label="题目标题">
  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
</FormField>
<FormField label="答案">
  <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} />
</FormField>
```

#### `Skeleton`（`src/components/ui/skeleton.tsx`）

- **props**：`className?: string`；`aria-hidden="true"` + `[animation:skeleton-pulse_1.4s_ease-in-out_infinite]`
- **用例**：

```tsx
{loading ? <Skeleton className="h-10 w-full" /> : <Content data={data} />}
```

#### `Separator`（`src/components/ui/separator.tsx`）

- **props**：`orientation?: "horizontal" | "vertical"`（默认 `horizontal`）；自带 `role="separator"`
- **用例**：

```tsx
<Separator />
<Separator orientation="vertical" className="mx-2" />
```

#### `ThemeToggle`（`src/components/ui/theme-toggle.tsx`）

- **props**：`className?: string`；icon-only 三态循环（`system → light → dark → system`）；`aria-label` 随 `theme` 动态更新（"当前 XXX 主题，点击切换到 YYY"）
- **依赖**：必须在 `ThemeProvider` 树内使用；`useTheme()` 不在 Provider 内会抛错
- **用例**（顶栏固定位置）：

```tsx
<ThemeToggle className="ml-auto" />
```

#### `ThemeProvider`（`src/components/ui/theme-provider.tsx`）

- **props**：`children: ReactNode`；封装 theme state + `localStorage.openInterviewTheme` 记忆 + `matchMedia` 订阅
- **挂载位置**：root layout（`src/app/layout.tsx`）；必须在全局树根，`ThemeToggle` 和任何使用 `useTheme()` 的客户端组件都在其下
- **useTheme 返回**：`{ theme: "system" | "light" | "dark", resolvedTheme: "light" | "dark", setTheme: (t) => void }`

### 3.2 工作台组件（`src/components/workbench/*`）

#### `PageHeader`（`src/components/workbench/page-header.tsx`）

- **props**：`title: string` · `actions?: ReactNode` · `highlights?: Array<{label, value, meta?}>`（走 `StatsRow` 渲染）· `className?` · `eyebrow?: string`（**@deprecated no-op**）
- **约定**：每页顶部一次；`actions` 右对齐放 Primary + Secondary；紧凑条样式 `rounded-lg + border + px-4 py-3`
- **用例**：

```tsx
<PageHeader
  title="随机练习"
  highlights={[
    { label: "本周完成", value: "12", meta: "↑ 3" },
    { label: "平均分", value: "82", meta: "/100" },
  ]}
  actions={<Button variant="primary" size="sm">开始练习</Button>}
/>
```

#### `SectionHeading`（`src/components/workbench/section-heading.tsx`）

- **props**：`title: string` · `description?: string` · `className?`
- **用例**：

```tsx
<SectionHeading title="最近考试" description="最近 30 天内的模拟考试记录" />
```

#### `EmptyList`（`src/components/workbench/empty-list.tsx`）

- **props**：`title: string` · `description?` · `bullets?: string[]` · `icon?: LucideIcon` · `action?: { label: string; href: string }`
- **约定**：`action` 用 `Button size="xl" variant="primary"` 独占一行（对应按钮规则 6）
- **用例**：

```tsx
<EmptyList
  title="还没有面经"
  description="从简历或外部面经库导入你的第一份"
  bullets={["支持 PDF / Markdown", "导入后可进入审核队列", "审核通过进入题库"]}
  icon={FileText}
  action={{ label: "导入面经", href: "/import" }}
/>
```

#### `DetailGrid`（`src/components/workbench/detail-grid.tsx`）

- **props**：`items: Array<{label, value, meta?}>` · `className?`
- **布局**：`grid sm:grid-cols-2 xl:grid-cols-4`，每格 `rounded-md + border + px-3 py-2`
- **用例**：

```tsx
<DetailGrid
  items={[
    { label: "来源", value: "LeetCode 精选" },
    { label: "题目数", value: "247" },
    { label: "导入时间", value: "2 天前" },
  ]}
/>
```

#### `StatsRow`（`src/components/workbench/stats-row.tsx`）

- **props**：同 `DetailGrid`；视觉更轻（`rounded-lg + px-4 py-3`，数字 `text-[15px] font-semibold`）
- **约定**：由 `PageHeader.highlights` 内部调用；也可独立使用

#### `FormField`（`src/components/workbench/form-field.tsx`）

- **props**：`label: string` · `description?: string` · `className?` · `children`（放 Input / Select / Textarea）
- **用例**：

```tsx
<FormField label="题目标题" description="简洁描述，不超过 40 字">
  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
</FormField>
```

#### `PlaceholderTable`（`src/components/workbench/placeholder-table.tsx`）

- **props**：`columns: string[]` · `rows: string[][]` · `className?`
- **用途**：技术性文档里的"样板表格"；正式业务表格请用 Card + 自建 `<table>`
- **用例**：

```tsx
<PlaceholderTable
  columns={["字段", "类型", "说明"]}
  rows={[["id", "string", "UUID"], ["title", "string", "题目标题"]]}
/>
```

---

## 4. 深色模式消费指南

### 4.1 机制概览

- 切换方式：根元素 `<html>` 的 `.dark` class；由 `ThemeProvider` 控制（`src/components/ui/theme-provider.tsx`）
- 持久化：`localStorage.openInterviewTheme` 存 `"system" | "light" | "dark"`；`root layout` 的 `<head>` 里注入 `themeBootstrap` IIFE 在 hydrate 前就读 localStorage 并打 class，避免 FOUC
- 三态语义：`system` 跟随 `prefers-color-scheme`；`light` / `dark` 显式指定；三态循环由 `ThemeToggle` 组件完成
- CSS 变体：`@custom-variant dark (&:where(.dark, .dark *))`（`globals.css:6`）把 Tailwind `dark:` 前缀绑定到 `.dark` 类

### 4.2 写支持双态的新组件

**原则 1：只用 token 变量，绝不硬编码颜色**

```tsx
// ✅ 自动双态
<div className="border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-foreground)]">

// ❌ 不会响应深色模式
<div className="border border-zinc-200 bg-white text-zinc-900">
```

**原则 2：需要强弱对比时用 `soft` 变体或 opacity**，不要自己挑色阶：

```tsx
// ✅ 自动在浅色用 #eff6ff，深色用 rgba(59,130,246,0.12)
<span className="bg-[color:var(--color-brand-soft)] text-[color:var(--color-brand)]">

// ✅ opacity 叠加
<div className="bg-[color:var(--color-brand)]/10">
```

**原则 3：必要时用 Tailwind `dark:` 前缀覆盖**（仅当某个组件需要深色下与浅色有不同拓扑时；通常不需要）：

```tsx
<div className="border border-[color:var(--color-border)] dark:border-transparent">
```

**原则 4：阴影只在 overlay 用**，优先用 border 分层。非 dropdown/dialog/popover 场景避免 `shadow-*`。

### 4.3 测试双态的方法

1. **浏览器手动**：`corepack pnpm dev` 后在 Console 执行 `document.documentElement.classList.add('dark')` / `.remove('dark')` 切换查看；或点 ThemeToggle 三态循环
2. **localStorage 直接控制**：`localStorage.openInterviewTheme = "dark"; location.reload()`；清空：`localStorage.removeItem("openInterviewTheme")`
3. **System 跟随验证**：macOS Sys Prefs / Windows 设置切换系统主题，不刷新页面应立即响应（`matchMedia` change event 订阅在 `theme-provider.tsx:53-60`）
4. **Vitest 组件测试**：render 时把 `<html>` class 设为 `dark`（参考 `tests/theme-toggle.test.tsx`）

### 4.4 已知踩坑

- 组件内写 `style={{ color: "#2563eb" }}` inline 硬编码不会随深色切；一律用 `color: "var(--color-brand)"` 或 `className="text-[color:var(--color-brand)]"`
- `<img>` 图片的背景透明度在深色下可能不协调；优先用 SVG 或 `lucide-react` 图标（自动 `currentColor`）
- 使用 Tailwind `dark:bg-zinc-900` 而不用 token 变量，深色色板与本系统不一致，视觉会断层

---

## 5. 反模式（禁止做法）

以下 5 条均为合并阻断项，review 发现直接打回：

1. **不要用 `<button>` 裸标签**。所有按钮走 `Button` 组件。理由：几何对齐 + focus ring + disabled 态 + `aria-label` 规范统一；裸 `<button>` 会在同排出现高度差，违反 `design.md §6.3`。
2. **不要在 className / style 里写死 hex 颜色**（如 `text-[#2563eb]` / `style={{ color: "#2563eb" }}`）。一律用 `--color-*` 变量或 `[color:var(--color-brand)]` 语法。理由：深色模式会断层；破坏 token 体系的可维护性。
3. **不要用旧 token 类名**：`border-border-strong` / `border-border-muted` / `text-text-strong` / `text-text-muted` / `bg-accent` / `text-accent` 等对应的 CSS 变量已在 M1 删除（`--color-border-strong` 等不存在），Tailwind 会编译成空变量引用导致视觉回落。必须用新 token：`border-[color:var(--color-border)]` / `text-[color:var(--color-muted-foreground)]` / `text-[color:var(--color-foreground)]` / `bg-[color:var(--color-brand-soft)]` / `text-[color:var(--color-brand)]`。参见 `docs/001-webui-refactor/m1-infra/report.md §4(d)` 的 430 处待修清单。
4. **不要在一个语境堆多个 Primary 按钮**。每个页面 / section / dialog 最多 1 个 Primary（按钮规则 1）。其他动作降级 Secondary / Ghost / Link。
5. **不要恢复被砍掉的装饰层**：`body` radial gradient / `.interactive-card` 全局类 / `.reveal-list` 入场动画 / `@keyframes radar-draw` / `--surface-nav` 深色靛紫 / IBM Plex 字体引用均已在 M1 删除且归档（`roadmap.md §4.4`）。需要 hover 视觉反馈请在 `className` 上显式 `hover:border-[color:var(--color-brand)] hover:bg-[color:var(--color-surface-subtle)]`；需要入场动画请重新评估是否符合"克制派动效"（`design.md §5.9`）。

---

## 参考来源

- `src/app/globals.css`（tokens 取值权威）
- `src/components/ui/*.tsx`（原子组件实现）
- `src/components/workbench/*.tsx`（工作台组件实现）
- `docs/001-webui-refactor/design.md`（设计决策总源，§§5-8 与本文件 §1-§4 对应）
- `docs/001-webui-refactor/m1-infra/report.md`（M1 完成报告，含 API 变更清单 + 已知退化）
- `docs/001-webui-refactor/m1-infra/tests/T1.9-regression-report.md`（回归验证证据）

<!-- handoff: H11 · status: complete · timestamp: 2026-04-15 17:43 -->
