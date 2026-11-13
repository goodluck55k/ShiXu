# 阶段三任务卡：主导性格行为引擎与互动

## 任务卡：behavior / character（分支 feature/companion-behavior）

### 归属与目标
- 阶段：阶段三 主导性格行为引擎与互动
- 模块：behavior、character（应用层调度归属 application）
- 一句话目标：小白人按当前主导性格自主行动，可被三种互动短暂打断，保存情绪日记后给出一次性短暂反馈。
- 对应 Issue / PR：面向 main 的阶段三 PR（本分支）。

### 输入与输出
- 输入：只读 `PersonalitySnapshot`（dominantId）、`character.currentEmotion`、`ConfirmedSaveContext`（lastConfirmedSave）、用户互动操作、应用层显式提供的 seed/sequence/dayKey/timeBand。
- 输出：`BehaviorDecision`（运行时内存）→ `CharacterView` → `CharacterRenderer` 最小占位表现；不产生快照变更。
- 状态所有权：behavior 无持久状态，仅运行时序号/最近行为计数；不拥有性格台账、日记、存档；调度与反馈只存内存。

### 公共契约
- 新增：`BehaviorId`、`BehaviorCategory`、`TimeBand`、`InteractionType`、`InteractionEvent`、`BehaviorContext`、`BehaviorDecision`、`BehaviorRuleConfig`、`selectBehavior`、`createBehaviorRng`、`selectSaveFeedback`（src/domain/behavior.ts）；应用层 `useBehaviorRuntime`、`computeSpecialEligibility`（候选判定，仅测试入口启用）。
- 修改：`CharacterView` 增加可选 `behaviorId`/`category`/`amplitude`（调试与最小幅度反馈）；`deriveCharacterView(snapshot, decision?)` 消费行为决策；`BehaviorDecision` 含 `amplitude`；配置行为条目含 `durationMs`、互动条目含 `interactionType`；`special` 含候选 `streakDaysRequired`/`lowMoodEmotionLabels`/`dayFourSemantics`；新增 `saveFeedbackDurationMs`。均同步 ARCHITECTURE §4.3/§5/§7。
- 消费的既有契约：`PersonalitySnapshot`/`derivePersonality`（personality，只读）、`EmotionReading`、`ConfirmedSaveContext`（AppProvider）、`StoragePort` 不新增调用。
- 禁止跨越：行为引擎不读日记（specialEligible 由应用层只读计算）、不写性格/存档；渲染层只读 CharacterView；互动/反馈不产生贡献。

### 配置与版本
- 配置文件：src/config/behavior.ts
- 规则版本：behavior-v2；不影响存档（无 schema 变化）。
- 可调参数（候选，PR 标注「参数待验收」）：ambientShare 0.15、specialProbability 0.15、minShare 0.05（以权重下限实现长期份额下限）、maxConsecutive 2、tickIntervalMs [20000,40000]、interactionDurationMs [2500,4000]、saveFeedbackDurationMs 3000、各行为 baseWeight/durationMs、ambientTimeWeights、emotionExpression。
- 待确认（正式保持关闭）：specialBehaviorEnabled=false；lowMoodEmotionLabels 候选 ["sadness"]；streakDaysRequired 候选 3；dayFourSemantics 候选 "A"（仅配置占位与测试入口使用，正式不触发）。

### 依赖与边界
- 前置依赖：PR #18 已合入的五维性格、PersonalitySnapshot 只读契约、v3 存档；阶段一/二保存与纠正流程。
- 明确不做：阶段四离线生活、阶段五重逢、V2 饰品、经验值/等级/奖励、AI 决定动作、复杂行为树/动画引擎、正式 UI 重设计、小白人形象重做、把特殊行为写成情绪改善手段。
- 占位与真实：真实＝四类分离、主导池选择、确定性 PRNG、最低份额、防连续、隐藏暂停、互动不加分、反馈幂等、特殊默认关闭；占位＝SVG 姿态/表情/动画与临时状态提示（阶段七重做）。

### 最小验收
- [x] 同上下文同种子同结果；五主导池独立可辨认；非主导维度与即时情绪不改变主池。
- [x] 每行为长期份额 ≥ minShare；同行为不连续超过 2 次。
- [x] 三种互动优先打断、时长后恢复自主；连续点击安全；不改变性格数据。
- [x] 保存成功反馈一次（eventId 消费一次），失败不反馈，刷新不重放；临时体验有标识。
- [x] 隐藏暂停调度、恢复重读状态、不补算；不按 tick 写 localStorage。
- [x] 特殊行为默认关闭；开启测试配置时双条件+概率命中才触发；A/B 语义可测试但未定稿。
- [x] 日记保存/纠正/主导展示/刷新恢复无回归（stage2 测试复跑）。
- 验证方式：`npx --yes tsx tests/stage3.ts` + stage2 复跑 + typecheck/lint/build + 浏览器最小冒烟。
- 未验证项：真实百炼 API（阶段六）；正式视觉与动画（阶段七）；候选参数产品验收。

### 存档与迁移
- schema 变化：无（仍 v3）。
- 迁移策略：无；行为/互动/反馈全部运行时内存，刷新即失。
- 失败处理：保存失败不触发反馈（lastConfirmedSave 仅在 SAVE_OK 更新）；不写存档故无半写状态。

### 风险与待确认
- 「低落日」标签映射、连续天数细则、第 4 天语义 A/B 未确认 → specialBehaviorEnabled 正式 false。
- minShare 以权重下限实现（无历史状态下的长期份额保证），属候选实现方式，待验收。
- tick/互动/反馈时长、权重、表情映射均为候选参数，待验收。