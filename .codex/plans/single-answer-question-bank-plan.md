# Single Answer Question Bank Plan

## 背景 / 目标

- 当前题库把 `canonical_answer` 和 `personal` answer variant 同时暴露给题库列表、详情和 QA 上下文，造成“仅标准答案”这类误导性筛选。
- parse review 确认导入和手动录题也会把上传答案额外写成 `personal`，导致题库里同一道题出现两套答案语义。
- 目标是将题库收口为单答案模型：题库只维护一个主答案，并以上传来源中的答案为准；题库浏览与详情不再区分“个人答案”。

## 影响范围

- review 导入：`src/server/services/parse-review-service.ts`
- 手动录题：`src/server/services/import-service.ts`
- 题库 schema / repository / service / routes：
  - `src/lib/schemas/questions.ts`
  - `src/server/repositories/question-browse-repository.ts`
  - `src/server/services/question-bank-service.ts`
  - `src/app/(workbench)/questions/page.tsx`
  - `src/app/api/questions/route.ts`
  - `src/app/api/questions/[questionId]/route.ts`
- 题库 UI：
  - `src/features/questions/question-bank-workbench.tsx`
  - `src/features/questions/question-detail-workbench.tsx`
- QA 上下文：`src/server/services/qa-session-service.ts`
- 文档：
  - `.codex/context/open-interview-questions-feature.md`
  - `.codex/context/open-interview-server-core-feature.md`
  - `docs/api-schema.md`
  - `docs/data-model.md`
  - `docs/ui-flows.md`

## 执行步骤

1. 调整 parse review / manual import，在确认导入时将 `source_answer`、`canonical_answer` 折叠为单一主答案，并停止新增 `personal` answer variant。
2. 删除题库列表中的 `has_personal_answer` 查询参数、接口字段和 UI 筛选。
3. 调整题库详情页，主答案只展示 `canonical_answer`，补充答案区仅展示非主答案补充视角。
4. 更新 QA 问题上下文，停止单独透出 `personalAnswer`。
5. 同步更新 L2 context 与 canonical 文档，执行测试、同构检查、`db:init`、`typecheck`、`lint`、`build`、`deploy:mvp`。

## 验证

- `corepack pnpm test`
- `python3 .catpaw/scripts/check_isomorphism.py --check`
- `corepack pnpm db:init`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `corepack pnpm deploy:mvp`
