# TypeScript / Next.js Rules

## 代码风格

- 2 空格缩进。
- 保留分号。
- 使用双引号。
- 优先使用 `@/` 别名导入。

## App Router

- `src/app/*` 只保留路由装配和 HTTP 边界处理。
- `route.ts` 不直接承载业务编排；将逻辑下沉到 `src/server/services/*`。
- 页面层优先复用 `src/features/*` 的 workbench 组件，而不是在路由文件里堆叠实现。

## 前端组件

- 可复用原子组件放在 `src/components/*`。
- 业务工作台组件放在 `src/features/*`，按 import / review / questions / interviews / qa / resume 分组。
- 客户端组件不直接访问数据库、仓库或 provider 适配器。
- 空态、加载态、错误态要显式渲染，不留下空白容器。

## 校验边界

- 所有服务边界输入输出优先通过 `src/lib/schemas/*` 的 Zod schema 约束。
- 公共 API 字段遵循 `docs/api-schema.md` 与 `docs/data-model.md`，不自行发明顶层字段。
