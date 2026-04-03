# Slice 9A — QA 对话式工作台 Shell

- task_id: oi-slice-9a-qa-dialog-workbench-shell
- owner: execution
- status: done
- priority: high
- delivery_note: 当前仓库主干已落地本 slice 对应能力；此文件保留为执行留痕，不再表示 future work。
- goal: 把现有 `/qa` 与 `/qa/:sessionId` 收成一个统一的对话式工作台，让 session 列表、聊天区和依据区成为默认主体验

## Scope
- in: 统一 `/qa` 与 `/qa/:sessionId` 的 workbench shell
- in: 左栏 recent sessions + 新建 session 入口
- in: 中间 transcript + 输入框的聊天式主布局
- in: 右栏 latest citations / related questions / retrieval summary
- in: 保持现有 session 创建、提问、刷新与历史渲染主链可用
- in: 将 `strategy` / `top_k` 从默认主控件降级为 advanced / debug 能力（可折叠、可弱化、可 feature-flag）

## Out of scope
- LangChain answer chain 接入
- retrieval 算法改造
- 0 citation 降级语义重写
- streaming
- LangGraph

## Constraints
- align with `docs/qa-dialog-rag-plan.md`
- 保留 canonical routes：`/qa`、`/qa/:sessionId`
- 不破坏现有 session / turn / citation / retrieval log 数据结构
- citations 与 retrieval trace 不能消失，只能调整展示优先级
- route handler 保持薄，主要改动收口在 feature UI 层

## Done when
- [x] `/qa` 与 `/qa/:sessionId` 呈现为统一视觉与布局体系
- [x] 左栏能稳定展示 recent sessions，并高亮当前 session
- [x] `/qa` 空态可直接提问，首问后创建 session 并进入 `/qa/:sessionId`
- [x] 聊天 transcript 成为主阅读区域，输入框位置符合连续提问习惯
- [x] citations / related questions / retrieval summary 有稳定位置，但不抢主体验
- [x] `strategy` / `top_k` 不再作为普通用户默认主操作项
- [x] validation + smoke complete

## Reviewer focus
- 这次改动是否真把 QA 主体验拉成“聊天优先”，而不是只换布局皮肤
- citations / related questions / retrieval summary 是否仍可见、可追踪
- `/qa` 与 `/qa/:sessionId` 是否共享一致 shell，而不是两套分裂页面
- 旧 session 数据是否无需迁移即可正常渲染

## Refs
- `docs/qa-dialog-rag-plan.md`
- `docs/ui-flows.md`
- `src/app/(workbench)/qa/page.tsx`
- `src/app/(workbench)/qa/[sessionId]/page.tsx`
- `src/features/qa/qa-workbench.tsx`
- `src/features/qa/qa-session-workbench.tsx`
- `src/features/qa/qa-ask-form.tsx`
