# 模块任务卡模板

本模板用于每个阶段/模块任务开工前固定范围，以及 PR 描述。它补充而不是替代既有文档：定位与玩法边界见 [PRODUCT_SPEC](PRODUCT_SPEC.md)，模块职责与公共契约见 [ARCHITECTURE](ARCHITECTURE.md)，性格与行为参数见 [COMPANION_SPEC](COMPANION_SPEC.md)，阶段顺序见 [ROADMAP](ROADMAP.md)。之所以单独成文：具体任务的范围、契约增量与验收随分支变化，写进上述基线文档会反复改写事实来源；PR 又需要一个稳定的字段集合供审核对照。

使用规则：

- 每个任务开工前填写一遍，作为开发与自检依据；PR 描述中保留同一份内容（可精简）。
- 只填本任务相关项；未涉及契约变更时写「无」，不得留空造成歧义。
- 任务卡与基线文档冲突时，以基线文档与 [AGENTS](../AGENTS.md) 为准，先修文档再开发。
- 不把后续阶段内容写进本卡；明确不做要写具体。

## 1. 模板

```markdown
## 任务卡：<模块 / 阶段>（分支 <branch>）

### 归属与目标
- 阶段：<ROADMAP 阶段编号与名称>
- 模块：<diary / emotion / personality / behavior / character / storage / decoration(V2)>
- 一句话目标：<用户可感知的结果>
- 对应 Issue / PR：<链接或编号，可空>

### 输入与输出
- 输入：<事件、用户操作、上游契约字段>
- 输出：<新快照、领域事件、视图、只读查询结果>
- 状态所有权：<本模块拥有并持久化的状态；明确不拥有哪些>

### 公共契约
- 新增契约：<名称、字段、版本>
- 修改契约：<名称、旧→新、兼容处理；无则写「无」>
- 消费的既有契约：<名称与来源模块>
- 禁止跨越：<不得直接读写的其他模块私有状态>

### 配置与版本
- 配置文件：<src/config/...>
- 规则版本：<如 personality-v1；变更是否影响旧存档>
- 可调参数：<参数名与当前值；候选参数标注「待确认」>

### 依赖与边界
- 前置依赖：<已合入 main 的模块/契约；未合入不得假定存在>
- 明确不做：<逐条列出>
- 占位与真实：<哪些是占位/mock，哪些必须真实>

### 最小验收
- [ ] <主流程 1：输入→结果>
- [ ] <幂等 / 纠正 / 迁移 / 失败路径中与本任务相关的项>
- [ ] <刷新后结果、旧存档兼容或错误提示>
- 验证方式：<人工页面冒烟 / 规则案例 / 一次类型检查，不要求覆盖率>
- 未验证项：<外部 API、真实账号能力等；如实记录>

### 存档与迁移
- schema 变化：<无 / vN→vN+1>
- 迁移策略：<保留字段、新增默认值、legacy 只读、不追溯>
- 失败处理：<保存失败不结算；损坏数据导出/重置>

### 风险与待确认
- <可能影响产品行为的取舍；候选参数需用户确认的项>
```

## 2. 示例（阶段二：性格引擎，示意，未开工）

```markdown
## 任务卡：性格引擎（分支 feature/personality-engine）

### 归属与目标
- 阶段：阶段二 性格评分与长期养成
- 模块：personality
- 目标：确认情绪后按确定性规则形成五维性格，可只读查询与自然语言描述

### 输入与输出
- 输入：CONFIRM_ENTRY / CORRECT_EMOTION（含 entryId、label、intensity、dayKey、eventId）
- 输出：PersonalityState（contributions、rulesVersion）、PersonalitySnapshot（scores、descriptions）只读查询
- 状态所有权：personality 贡献台账与规则版本；不拥有日记正文、情绪草稿与渲染状态

### 公共契约
- 新增：PersonalityState / PersonalitySnapshot / PersonalityRuleConfig / 五维 DimensionId
- 修改：Snapshot v2→v3（新增 personality，旧 companion 入 legacy）
- 消费：EmotionReading、ConfirmedSaveContext
- 禁止跨越：不得读写 behavior 状态、不得修改 Entry 或 memories

### 配置与版本
- 配置文件：src/config/personality.ts
- 规则版本：personality-v1（不影响已保存旧贡献）
- 参数：初始 50、上下限 20–80、单次 ±3、单日单维 ±4、强度分档 0.35/0.7（候选，PR 标注「参数待验收」）

### 依赖与边界
- 前置：PR #8/#10 已合入的三维护账与情绪接口；本任务替换其为五维
- 明确不做：自主行为、UI/动效、饰品、旧三维护账换算、AI 参与评分
- 占位与真实：五维文案与规则必须真实；行为表现留给阶段三

### 最小验收
- [ ] 保存日记后五维按表变化，相同输入重复提交分数不变
- [ ] 纠正情绪替换当日贡献，跨日纠正沿用原 dayKey
- [ ] 旧存档可读取，XP/阶段/旧三维护账不参与结算且不被删除
- [ ] 保存失败不产生新分数；刷新后结果一致
- 验证方式：规则案例 + 一次页面冒烟
- 未验证：真实百炼调用（阶段四）

### 存档与迁移
- schema：v2→v3
- 迁移：entries/memories/appliedEventIds/revision 原样保留；personality 从初始值起；旧字段入 legacy 只读；不追溯旧日记
- 失败：迁移在内存完成，成功 save 才落盘；损坏数据保留 raw

### 风险与待确认
- 五维是否为最终维度、强度分档与惯性参数需用户确认
```
