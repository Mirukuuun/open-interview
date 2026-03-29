# Open Interview MVP retrospective（一期复盘）

- status: done
- updated_at: 2026-03-25T14:40:00+08:00
- focus: 团队协作 / 交互与验收 / 开发工作流程 / Codex CLI prompt 设计
- out_of_scope: 代码质量本身、长期产品 roadmap

## 1. 总结一句话

Open Interview 一期不是“做不出来”，而是**能持续交付，但在“用户验收语义 → Codex 可执行合同 → execution closeout → reviewer gate → task/doc/status 收口”这条链上反复掉坑**。

换句话说：
- **做事能力够**
- **收口能力、协作协议、prompt 协议还不够硬**

## 2. 做得好的地方

1. **bounded slice 模式有效**
   - Slice 0 ~ 6 按主链能力推进，MVP 没有陷入“大而全一次性开发”。
2. **Codex-only product code path 让边界更清楚**
   - Lead 定义范围、execution 驱动 Codex、reviewer 独立验收，这个基本分工是成立的。
3. **reviewer gate 很有价值**
   - reviewer 不只是看 diff，而是真的做独立 validation / smoke / fresh server / DB proof，能抓住 execution 最容易漏掉的地方。
4. **真实验收反馈能迅速压缩成下一轮 bounded task**
   - AT-V1-009 / 010 都说明：用户反馈 -> 新任务 -> execution -> reviewer 这条链已经能跑。
5. **文档链路基本存在**
   - execution plan、task 文件、review 记录至少形成了一个能追溯的协作骨架。

## 3. 这期最核心的问题

### P1. 用户验收语义没有被充分协议化
典型表现：
- “默认无需审核” 被不同人理解成不同东西：
  - default manual direct-ingest
  - vs parse 后 silent auto-confirm
- “删解释性文本” 在 Round 1 被执行成“改了一点文案”，而不是“明显减量”。
- “下拉多选 + 面板底部创建” 在 Round 1 被错误落成“平铺一堆选项”。

本质：
- 用户原话有方向，但没有被转成足够硬的 implementation contract。

### P2. execution closeout discipline 不够强
典型表现：
- Codex 退出了，但没有 structured completion
- 有 diff，但没有 validation 证据
- 有实现，但没有 smoke 证据
- task 还停在 `in_progress`
- docs / execution plan 没同步

本质：
- 团队经常把“功能做出来”当成“完成”，而不是把 closeout 当成强制出口。

### P3. reviewer 经常在替 execution 补最后一公里
典型表现：
- reviewer 不只是验收，还经常要补：
  - fresh server
  - 独立 validation
  - 独立 smoke
  - DB proof
  - task/doc/status 收口提醒

本质：
- reviewer gate 有效，但前一道 execution closeout gate 不够硬。

### P4. prompt 对 forbidden / proof / done-when 写得还不够制度化
典型表现：
- 只说 goal，不足以防漂移
- 对“不许怎么理解”“必须证明什么”写得太软
- 一个 prompt 混了实现、验收、文档、部署，导致后半段 closeout 更容易掉

本质：
- 现在已有 prompt 经验，但还没沉淀成统一模板。

### P5. 状态同步与任务收口容易滞后
典型表现：
- 已完成任务仍长期挂着 `in_progress`
- heartbeat / watchdog 需要反复清陈旧状态
- 真实交付已完成，但任务记录、plan、daily memory 不一致

本质：
- 任务状态更新没有变成定义完成的一部分。

## 4. 根因分析

### 根因 A：Lead 的任务定义常常“有方向”，但不总是“可执行、可验收、可证据化”
缺少的通常是：
- forbidden interpretations
- expected interaction proof
- negative proof
- reviewer check points
- smoke proof points

### 根因 B：缺少统一的“验收问题映射表”
没有把以下五层一一对齐：
1. 用户原话
2. Lead 翻译后的执行语句
3. Codex prompt
4. reviewer checklist
5. smoke / proof

### 根因 C：closeout 不是硬门槛
虽然已有 execution closure rule，但执行时还没有变成“没过这一关就不算 done”的强约束。

### 根因 D：对“最小改动”的团队共同语义不稳定
一旦需求碰到产品语义（审核、导入、分类模型），execution/Codex 容易从“验收修整”滑向“机制重设”。

### 根因 E：运行层面没有标准恢复 runbook
Codex usage limit / workspace deactivated / stale server 这些问题都处理过，但处理方式更像临场反应，不像既定流程。

## 5. 最值得马上改的 5 件事（按优先级）

### 1. 建立“验收问题映射模板”
每个 acceptance round 开跑前必须先写清：
- 用户原话
- Lead 翻译
- in scope
- out of scope
- forbidden interpretations
- reviewer 怎么验
- smoke 怎么证

### 2. 固化统一的 Codex bounded prompt 模板
每次给 Codex 的 prompt 必须固定包含：
- Goal
- In scope / out of scope
- Must preserve
- Forbidden changes / forbidden interpretations
- Done when
- Required validation
- Required smoke proof
- Required handoff format

### 3. 建立 reviewer-ready preflight gate
execution 在提请 reviewer 之前，必须先满足：
- validation 已完成
- smoke 已完成
- changed files 已整理
- risks/deferred 已写
- task status / done_when 已同步
- plan/doc 是否要更新已有说明

### 4. 把 closeout 变成硬门槛，而不是礼貌动作
真正的 done 必须同时包含：
- structured completion
- validation evidence
- smoke evidence
- task/doc/status 收口
- 必要时 commit/push/deploy 记录

### 5. 给 Codex / execution 加“标准恢复 runbook”
针对以下问题，应该有标准动作：
- usage limit
- `deactivated_workspace`
- stale local server
- Codex 退出 0 但没 handoff
- 任务已有 dirty diff，如何 resume 而不是 full rerun

## 6. 下一期建议流程

1. **先写 Acceptance Contract**
   - P0 / P1
   - 用户原话
   - 预期交互行为
   - 禁止误解
   - 证据点
2. **Lead 基于 Contract 生成 Codex prompt**
3. **execution 分 5 个 phase 跑**
   - boundary check
   - implementation
   - diff audit
   - validation
   - smoke + structured completion
4. **reviewer 只接 reviewer-ready 包**
5. **Lead 负责最终收口**
   - task done
   - plan 更新
   - commit/push/deploy 记录
   - 对外口径统一

## 7. 最终结论

Open Interview 一期已经证明：
- 这套 Team + Codex + reviewer 的模式**能把产品做出来**。

但也同样证明：
- 下一期最值得优化的，不是“写代码速度”，而是**协作协议、prompt 协议、closeout 协议、验收协议**。

一句话：

> 一期的瓶颈不是实现能力，而是“把实现稳定转化为可交付结果”的团队流程。
