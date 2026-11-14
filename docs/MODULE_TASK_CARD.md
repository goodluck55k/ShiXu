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
- 模块：<diary / emotion / personality / behavior / offlineLife / reunion / character / storage / decoration(V2)>
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
- 规则版本：<如 personality-v2 / behavior-v2 / offline-life-v1 / reunion-v1；变更是否影响旧存档>
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

## 2. 示例（阶段二：五维性格与主导判定，示意，未开工）

```markdown
## 任务卡：五维性格与主导判定（分支 feature/personality-five-dim）

### 归属与目标
- 阶段：阶段二 五维性格领域模型、评分与持久化
- 模块：personality
- 目标：确认情绪后按确定性规则形成五维性格，持久化贡献账本，派生当前主导性格与自然语言描述

### 输入与输出
- 输入：CONFIRM_ENTRY / CORRECT_EMOTION（含 entryId、label、intensity、dayKey、eventId）
- 输出：PersonalityState（contributions、dominantId、rulesVersion）、PersonalitySnapshot（scores、dominantId、dominantDescription、descriptions）只读查询
- 状态所有权：personality 贡献台账、主导标记与规则版本；不拥有日记正文、情绪草稿、行为调度与渲染状态

### 公共契约
- 新增：PersonalityState / PersonalitySnapshot / PersonalityRuleConfig / DimensionId / DominantId / PersonalityContribution
- 修改：Snapshot v2→v3（新增 personality，旧 companion 入 legacy；character 的 XP/阶段入 legacy）
- 消费：EmotionReading、ConfirmedSaveContext
- 禁止跨越：不得读写 behavior/offlineLife/reunion 状态，不得修改 Entry 或 memories

### 配置与版本
- 配置文件：src/config/personality.ts
- 规则版本：personality-v2（旧贡献按各自 rulesVersion 重放，不随新配置改变）
- 参数：初始 50、上下限 20–80、单次 ±3、单日单维 ±4、强度分档 0.35/0.7、roomFactor 1.0（均为候选，PR 标注「参数待验收」）
- 初始分/上下限是存档级不变量；变更必须显式迁移，不能只升版本让旧分随新配置变化

### 依赖与边界
- 前置：PR #8/#10 已合入的三维护账与情绪接口；本任务以五维护账替换，不沿用三维修正逻辑
- 消费：`CompanionScreen` 改为读取 `PersonalitySnapshot` 的 `dominantDescription`；只替换只读数据源，不改布局/样式
- 明确不做：自主行为、离线生活、久别重逢、正式 UI/动效、饰品、旧三维护账换算、AI 参与评分或主导判定
- 占位与真实：五维评分与主导规则必须真实；行为表现留给阶段三

### 最小验收
- [ ] 保存日记后五维按候选表变化，相同输入重复提交分数不变
- [ ] 同日多篇后纠正较早一篇：只按当日余量重算该条，其他条目不重算，余量不足可为 0
- [ ] 纠正情绪替换当日贡献，跨日纠正沿用原 dayKey
- [ ] 主导为当前最高分；只有另一维严格超过才切换，并列保留当前主导，初始并列按固定优先级
- [ ] 界面只出现主导性格描述，不出现分数、排名或五维数值
- [ ] 旧存档可读取，XP/阶段/旧三维护账不参与结算且不被删除
- [ ] 迁移后无新贡献的旧条目被纠正时不补建贡献、不改分数
- [ ] 保存失败不产生新分数；刷新后结果一致
- [ ] 规则版本升级或旧配置缺失不改变已保存贡献的派生分数
- 验证方式：规则案例 + 一次页面冒烟
- 未验证：真实百炼调用（阶段六）

### 存档与迁移
- schema：v2→v3
- 迁移：entries/memories/appliedEventIds/revision 原样保留；personality 从初始值起、dominantId 为 null；旧字段入 legacy 只读；不追溯旧日记
- 迁移后旧条目没有新贡献；纠正只更新情绪/修订/历史，不补建贡献、不改分数
- 校验：读取按贡献自身 `rulesVersion` 校验；新写入按当前版本：历史绝对值未超限时同日单维合计不得越界，历史绝对值已超限时只允许 0 或绝对值严格减小（结果可仍越界，如 `+6` 加 `-1` 得 `+5`）；`dominantId` 必须为五维之一或 null
- 失败：迁移在内存完成，成功 save 才落盘；损坏数据保留 raw

### 风险与待确认
- 强度分档、roomFactor 惯性、每日上限（候选 4，当前代码 6）、并列优先级与描述分档需用户确认
- 连续低落特殊行为规则已于 2026-11-14 定稿（`sadness`、连续四个自然日、语义 B、0.15）；本阶段不接入，正式保持关闭，待独立实现任务验收
```
