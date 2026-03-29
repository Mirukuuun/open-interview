# LLM Chinese Prompt And Timeout Plan

## 背景 / 目标

- 当前 `sub2api / gpt-5.4` 能解析短样本，但会把 `question_text`、`canonical_answer` 产生成英文摘要式文本。
- 长文档解析在当前线上配置下会命中 provider timeout，需要进一步放宽解析超时窗口。
- 目标是让 interview parse prompt 明确要求自然语言字段使用中文，并把线上解析超时提升到 600 秒。

## 影响范围

- 解析 adapter：`src/server/adapters/openclaw/parse-source.ts`
- 测试：`tests/parse-source.test.ts`
- L2 文档：`.codex/context/open-interview-server-core-feature.md`
- 运行配置：`/etc/systemd/system/open-interview-mvp.service.d/llm-provider.conf`

## 执行步骤

1. 更新 LLM parse instructions 和 prompt rules，明确自然语言字段必须使用简体中文。
2. 补充测试，验证发给 provider 的 parse 请求包含中文约束。
3. 更新 L2 文档，记录 server-side parse 的语言约束和超时可配置性。
4. 将线上 `LLM_TIMEOUT_MS` 调整为 `600000`，执行测试、同构检查、`db:init`、`typecheck`、`lint`、`build`、`deploy:mvp`。
5. 部署后用小样本 Markdown 走一次真实上传解析，检查结果是否为中文。

## 验证

- `corepack pnpm test`
- `python3 .catpaw/scripts/check_isomorphism.py --check`
- `corepack pnpm db:init`
- `corepack pnpm typecheck`
- `corepack pnpm lint`
- `corepack pnpm build`
- `corepack pnpm deploy:mvp`
