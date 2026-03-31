## 背景 / 目标

- 当前 `/import` 在“保存并创建解析任务 / 上传并进入审核”时会同步等待解析完成，用户需要在按钮 `处理中...` 状态下等待到 `needs_review` 或 `failed`。
- 目标是把交互改为异步触发：请求成功时立即返回任务已触发，并提示去审核队列查看进度；请求创建失败时立即返回失败提示。

## 影响范围

- `src/server/services/parse-review-service.ts`
- `src/features/import/import-actions-panel.tsx`
- `src/app/api/sources/upload/route.ts`
- `tests/*`
- `.codex/context/open-interview-import-feature.md`

## 编码步骤

1. 将 parse job 创建 / 重试改为“写入 pending 后后台执行”，避免 route 同步等待解析完成。
2. 调整导入页成功 / 失败提示，明确“任务已触发，请到审核队列查看进度”。
3. 如有必要，同步整理上传接口的 next-step 语义，确保与异步状态一致。

## 测试或 Smoke 验证

- 补充测试覆盖 create / retry 返回 `pending`，并最终异步推进到 `needs_review` 或 `failed`。
- 执行 `python3 .catpaw/scripts/check_isomorphism.py --check`。
- 执行 `corepack pnpm typecheck`、`corepack pnpm lint`、`corepack pnpm build`。

## L2 文档回环

- 更新 `.codex/context/open-interview-import-feature.md`，说明导入页触发解析后立即返回，进度在 review 队列观察。

## 同构检查

- 完成代码与文档后复跑同构检查，确认 `@feature` 与 L2 文档保持一致。
