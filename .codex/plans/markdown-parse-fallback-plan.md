# Markdown Parse Fallback Plan

## 背景 / 目标

- 当前上传较长的 Markdown 文档后，`extract_interview` 解析会因为外部 LLM provider 失败而直接落成 `failed`。
- 这会阻断 `导入 -> 解析 -> review` 主链路，即使仓库内已经有可用的启发式解析能力。
- 目标是在 provider 不稳定时默认退化到启发式解析，并让 Markdown 标题文本在候选题目里保持可读。

## 影响范围

- 解析 adapter：`src/server/adapters/openclaw/parse-source.ts`
- 测试：`tests/`
- L2 文档：`.codex/context/open-interview-server-core-feature.md`

## 执行步骤

1. 调整 interview parse fallback 策略，默认启用启发式回退，仅允许通过环境变量显式关闭。
2. 补强 Markdown 文本清洗，避免 `###` 之类结构符号进入题目文本。
3. 新增 parse adapter 测试，覆盖 provider 失败后的回退与显式关闭回退两种场景。
4. 更新 L2 文档，并执行测试、同构检查、`db:init`、`typecheck`、`lint`、`build`、`deploy:mvp`。

## 验证

- `corepack pnpm test`
- `python3 .catpaw/scripts/check_isomorphism.py --check`
- `corepack pnpm db:init`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `corepack pnpm deploy:mvp`
