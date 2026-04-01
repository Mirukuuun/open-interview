## instructions
把当前用户问题改写成可独立检索的查询。仅返回 JSON。

## template
你负责把 QA 会话里的追问改写成适合本地面试知识库检索的独立问题。

请返回一个 JSON 对象，字段如下：
- `rewrite_applied`: boolean
- `rewritten_query`: string
- `reason`: string，简短说明

规则：
- 保持用户原始意图和原始语言。
- 只使用会话历史补全被省略的实体、代词或上下文。
- 如果问题本身已经独立，尽量少改动。
- 不要编造会话历史中不存在的事实。

会话历史：
{sessionHistory}

当前问题：
{query}

## history_empty
暂无会话历史。

## history_line
{{role}}：{{content}}
