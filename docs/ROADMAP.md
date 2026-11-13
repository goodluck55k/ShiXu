# 分阶段开发路线（V1）

> 本路线以 [PRODUCT_SPEC](PRODUCT_SPEC.md) 的 V1 范围为准，性格与行为细节以 [COMPANION_SPEC](COMPANION_SPEC.md) 为准，契约与存档以 [ARCHITECTURE](ARCHITECTURE.md) 为准。阶段顺序按依赖排列；每个阶段一个独立分支、一张模块任务卡、一个面向 `main` 的 PR。不得跳过未完成的前置阶段，不得把未合入的接口当作 `main` 已有。
>
> 阶段编号只表示实施顺序，不表示优先级或审核等级；P0/P1/P2 仍按 [AGENTS](../AGENTS.md) §4.1 解释。

## 1. 已完成事实与当前状态

| 事项 | 状态 | 分支 / PR | 说明 |
| --- | --- | --- | --- |
| 原始开发指南 | 已合入 | `docs/development-guide` / PR #1 | 早期方向，已被后续指南取代 |
| 规范补充（ROADMAP 执行、契约缺口） | 已合入 | PR #2、#3 | 现行规范的基础 |
| P1 Web 骨架：原文日记、手选情绪、本地存档、异常恢复 | 已合入 | `feature/web-skeleton` / PR #4 | 阶段一基线 |
| 多页面与小人活动空间 | 已合入 | `design/p1-multipage-ui` / PR #5 | 临时界面，不是正式视觉 |
| 隐藏性格 v1（三维护账、纠正替换、v1→v2 迁移） | 已合入 | `feature/companion-personality` / PR #8 | **将被五维体系替代**；迁移时保留 |
| 统一开发规范 | 已合入 | PR #7 | 本文档继续沿用并调整 |
| 旧装饰规则文档 | 已合入 | `docs/v2-decoration-rules` / PR #9 | 装饰后置到 V2，规则需按 V2 重写 |
| C2 AI 情绪建议（百炼适配器 + mock + 手选降级 + 确认） | 已合入 | `feature/emotion-analysis` / PR #10 | 阶段六基础已具备 |
| 五维性格领域模型、`personality-v2` 评分、v3 存档与迁移 | 已合入 | `feature/personality-five-dim` / PR #18 | 阶段二 |
| 主导性格行为、互动、连续低落特殊行为 | 已合入 | `feature/companion-behavior` / PR #19 | 阶段三 |
| 离线自主生活 | 开发中 | `feature/offline-life` | 阶段四；本分支实现，待审核 |
| 久别重逢 | 未开发 | — | 阶段五 |
| AI 情绪识别复核与主流程整合 | 未开发（基线已有） | — | 阶段六 |
| 原创小白人形象、表情动作、正式页面体验 | 未开发 | — | 阶段七 |
| 完整演示、兼容检查与交付 | 未开发 | — | 阶段八 |
| V2 饰品装扮模块 | 未开发、未排期 | — | V1 稳定后独立启动 |

`main` 当前已有：日记/手选/AI 建议/存档恢复、五维 `personality-v2` 台账与纠正替换、v3 存档与迁移、主导性格只读描述、主导性格行为/互动/保存反馈（阶段三）、静态小人占位、多页面壳。**没有**：离线生活（阶段四分支开发中）、久别重逢、正式角色形象、饰品。

## 2. 阶段顺序与依赖

### 阶段一：Web 骨架与记录闭环（已完成）

- 前置：无。
- 范围：原文日记、九类手选情绪、VAD 调整、保存/历史/刷新恢复、localStorage 隔离、异常提示。
- 公共接口：`Entry`、`EmotionReading`、`Snapshot`、`StoragePort`、`CONFIRM_ENTRY`、`EDIT_ENTRY_TEXT`。
- 明确不做：AI 识别、性格、行为、饰品、正式视觉。
- 最小验收：写日记→手选→保存→刷新可见；失败不丢草稿；损坏存档有提示。
- 分支：`feature/web-skeleton`（已完成）。

### 阶段二：五维性格领域模型、评分与持久化（已完成，PR #18）

- 前置：阶段一合入；[ARCHITECTURE](ARCHITECTURE.md) §4.2 契约评审通过；五维名称与候选参数可按本指南实现，但 PR 必须标注「参数待验收」。
- 范围：
  - 新增 `src/config/personality.ts`：五维定义、`personality-v2` 九情绪候选表、初始/上下限、单次/单日上限、强度分档、惯性（`roomFactor` 待确认时取 1.0）、描述文案、`dominantPriority`。
  - 新增 `src/domain/personality.ts`：`derivePersonality`、`getDimensionScore`、`describeDominantPersonality`、`resolveDominant`、贡献构建/替换、按 `rulesVersion` 读取历史配置。
  - 扩展 `applyGameEvent` 的 `CONFIRM_ENTRY` / `CORRECT_EMOTION`：写五维贡献、纠正替换、单日上限、幂等；`EDIT_ENTRY_TEXT` 不改贡献。
  - `schemaVersion` 升到 3；新增 `migrateSnapshotV2toV3`。旧三维台账、`character.totalXp/stage`、`decorations`、习惯/世界痕迹进入 `legacy`；新五维从初始值开始。
  - `AppProvider` 接入新派生、迁移与保存边界；陪伴页只替换为 `PersonalitySnapshot` 只读数据源（仅显示主导描述），不改布局/样式。
- 公共接口：`DimensionId`、`PersonalityState`、`PersonalityContribution`、`PersonalitySnapshot`、`PersonalityRuleConfig`、`derivePersonality`、`getDimensionScore`、`describeDominantPersonality`、`resolveDominant`、`migrateSnapshotV2toV3`。
- 明确不做：行为选择、动画、互动、离线生活、重逢、饰品、AI 改动、正式 UI、旧三维换算、经验值/等级/阶段结算。
- 最小验收：
  1. 重复 `eventId` 不重复计分；同一天单维净变化不超过候选上限 4（未验收，需用户确认）。
  2. 纠正替换旧贡献；同日多篇后纠正较早一篇只按余量重算该条，余量不足可为 0；编辑正文不改贡献；其他日期与其他条目不受影响。
  3. v2 存档迁移后正文、情绪、纠正、历史逐字保留；旧台账不参与新分数；迁移后无新贡献的旧条目被纠正时不补建贡献、不改分数。
  4. 主导选择稳定：严格超过才切换；并列保留当前主导；初始并列按 `dominantPriority`；描述无数字、无排名、无诊断词；不展示五维分数。
  5. 规则版本升级或旧配置缺失不改变已保存贡献的派生分数；保存失败不结算。
- 建议分支：`feature/personality-five-dim`。

### 阶段三：主导性格行为引擎与互动（已合入，PR #19）

- 前置：阶段二合入；`PersonalitySnapshot` 只读契约与 `dominantId` 稳定；UI 仍处于冻结期，只允许功能所需的最小呈现。
- 范围：
  - 新增 `src/config/behavior.ts`、`src/domain/behavior.ts`：`BehaviorRuleConfig`、`BehaviorContext`、`BehaviorDecision`、`selectBehavior`、`BehaviorCategory`。
  - 行为候选池按主导性格分离（温柔/好奇/开朗/害怕/低落各四项），普通待机、主导行为、特殊行为、主动互动逻辑分离；其他维度不参与主行为加权。
  - 确定性加权选择：主导池 + 显式种子；最低占比、防连续重复；当前情绪只映射表情/动作幅度，不改变主导池。
  - 运行时调度：页面可见时按间隔决策；隐藏暂停；尊重 `prefers-reduced-motion`；不写存档。
  - 基础互动（呼唤/摸摸头/凑近看看）与保存后一次性情绪反馈；互动不增加分数。
  - 连续低落特殊行为：只在「`low_mood` 主导 + 连续低落日达标」时按概率出现；`specialBehaviorEnabled=false` 直到「低落情绪标签映射」与「第 4 天语义 A/B」经用户确认；不产生奖励/成长/额外积分。
  - 把行为决策映射为最小 `CharacterView` 占位表现。
- 公共接口：`BehaviorId`、`BehaviorCategory`、`BehaviorContext`、`BehaviorDecision`、`BehaviorRuleConfig`、`selectBehavior`、`InteractionEvent`。
- 明确不做：世界成长、习惯、长期行为历史、饰品、AI 控制动作、复杂行为树、正式动画。
- 最小验收：同上下文同结果；主导行为可辨认；其他维度不改变主行为池；每种行为 ≥ 最低占比（候选 5%）；同行为不连续超过 2 次；互动不增加分数；隐藏后停止决策；特殊行为两条件缺一不触发且默认关闭；行为决策不写存档、不产生成长。
- 建议分支：`feature/companion-behavior`。
- 当前状态：已合入 `main`（PR #19）。行为配置（behavior-v2）、确定性四类选择、运行时调度（隐藏暂停/低动态）、三种互动、保存后一次性反馈、连续低落特殊行为机制（`specialBehaviorEnabled=false`，仅测试入口）与最小角色占位表现均已实现；候选参数仍待验收。

### 阶段四：离线自主生活（开发中：feature/offline-life）

- 前置：阶段三合入；行为引擎可读主导快照；`SESSION_STARTED` 契约与事件幂等评审通过。
- 范围：
  - 新增 `src/config/offlineLife.ts`、`src/domain/offlineLife.ts`：`OfflineLifeRuleConfig`、`OfflineLifeState`、`OfflineLifeEvent`、`planOfflineLife`。
  - 按最后一次有效活动（`lastActiveAt ?? lastVisitAt`）、当前主导性格、显式种子生成有限离线事件；温柔/好奇/开朗/害怕/低落各有活动池。
  - 新增 `ACTIVITY_CHECKPOINT`：页面隐藏/`pagehide`/刷新前提交，可见期间最多每 5 分钟更新一次 `lastActiveAt`；同一标签页可用 `sessionStorage` 救援值避免刷新误判；不按行为 tick 写盘。
  - 通过 `SESSION_STARTED` 事件写入 `offlineLife` 与 `reunion` 窗口；事件 ID 与 `windowStart` 幂等；保存成功后才展示离线生活。
  - 首次使用或迁移后 `lastVisitAt=null` / `lastActiveAt=null`，不生成“过去的生活”；离线事件不是日记，不进入回忆，不改变五维。
  - 关闭/崩溃/写入失败时按最后一次成功 checkpoint 降级，可能高估但不反向少算；保存失败不展示。
- 公共接口：`OfflineLifeState`、`OfflineLifeEvent`、`OfflineLifeRuleConfig`、`planOfflineLife`、`ACTIVITY_CHECKPOINT`、`SESSION_STARTED`。
- 明确不做：后台持续 Agent、离线成长/衰减、离线惩罚、资源掉落、伪造日记、实时大模型。
- 最小验收：同一离线窗口只生成一次；长时间离线不增加 `low_mood`；不改变任何五维分数；不掉饰品/装扮/资源；事件数量有上限；保存失败不展示、不留半写状态；刷新不重复，且同一标签页刷新不误判为离线。
- 建议分支：`feature/offline-life`。
- 当前状态：该分支已实现离线配置（offline-life-v1，候选参数）、`planOfflineLife` 确定性纯函数、五主导活动池、`ACTIVITY_CHECKPOINT` 单调推进、`SESSION_STARTED` 窗口幂等写入、应用层会话启动与检查点调度、同标签页 `sessionStorage` 救援、陪伴页最小离线展示；`reunion` 仅写不触发的合法值（阶段五预留）。schema 仍 v3。候选参数待验收，PR 待审核，未合入 `main`。

### 阶段五：久别重逢

- 前置：阶段四合入；`lastVisitAt` / `lastActiveAt`、`windowStart` 与 `reunion` 状态稳定；问候模板配置可读。
- 范围：
  - 新增 `src/config/reunion.ts`、`src/domain/reunion.ts`：`ReunionRuleConfig`、`ReunionState`、`evaluateReunion`。
  - 候选阈值：严格超过 3 天未访问；按主导性格选择问候语气与生活经历描述；基础问句「最近过得还好吗？」。
  - 同一次缺席只触发一次；记录 `lastTriggeredWindowStart`；页面刷新不重复；回答或跳过不改变性格分数；只有正式保存的情绪日记产生贡献。
  - 所有文案本地模板化，不实时调用大模型；不使用责备、道德绑架或负罪感文案。
- 公共接口：`ReunionState`、`ReunionRuleConfig`、`evaluateReunion`；不新增存档字段（复用阶段四写入的 `reunion`）。
- 明确不做：AI 实时生成问候、把回答当日记、回答加分、连续登录奖励、负罪感文案。
- 最小验收：>3 天触发一次；刷新不重复；回答/跳过不加分；保存失败不展示；无责备文案；不同主导性格模板可区分；阈值/文案可配置。
- 建议分支：`feature/reunion`。

### 阶段六：AI 情绪识别复核与主流程整合

- 前置：阶段二～五合入；[AI_CONTRACT](AI_CONTRACT.md) 稳定；本阶段不改变性格、主导、行为、离线与重逢规则。
- 范围：
  - 复核 `/api/emotion` 的请求/响应三元组匹配、过期响应丢弃、低置信度提醒、未知情绪回落。
  - 真实百炼账号联调（需要 Key 时人工验证）；mock 只用于测试，不默认启用。
  - 确认交互收尾：AI 建议必须用户确认或修改后才可保存；手选始终可用。
  - 输入长度、请求体限制、限流、超时、成本保护的现有实现复核。
- 公共接口：`EmotionApiRequest`、`EmotionApiResponse`、`EmotionSuggestion`、`validateAnalysis`（均不变）。
- 明确不做：AI 决定性格/主导/动作/存档/离线/重逢；多模型编排；把模型输出直接写入状态；改评分参数。
- 最小验收：无 Key 手选全流程；AI 失败/超时/格式错误/低置信度均可继续；AI 建议未经确认不改变正式情绪；服务端密钥不出现在客户端；AI 不参与主导判定、行为、离线、重逢。
- 建议分支：`feature/emotion-ai-review`（复用已有 `feature/emotion-analysis` 亦可）。

### 阶段七：角色视觉、表情动作与 V1 体验

- 前置：阶段二～六合入；用户重新确认 V1 视觉方向（本阶段解除 UI 冻结）。
- 范围：
  - 原创全白小人基础形象（SVG，`viewBox 0 0 240 320`），身体/四肢/五官基础图层。
  - 五类主导性格行为与普通待机/互动/特殊行为的可辨认表现；九类情绪表情；`prefers-reduced-motion` 降级。
  - 陪伴页、记录页、回忆页的必要布局与空态/错误态/保存状态；移动端可用性。
  - 角色展示层严格只读 `CharacterView`，不判定性格、主导或解锁。
- 公共接口：`CharacterView`、`AppearanceConfig`（V1 不填实现）、图层白名单。
- 明确不做：饰品/装扮/库存/槽位；V2 解锁逻辑；与玩法无关的重设计。
- 最小验收：五类主导行为可辨认；九情绪表情可辨认；无饰品入口；刷新后状态一致；低动态设置生效；窄屏可用。
- 建议分支：`feature/character-visual`。

### 阶段八：完整演示、兼容检查与交付

- 前置：阶段二～七合入。
- 范围：
  - 端到端演示线（PRODUCT_SPEC §10）与人工验收。
  - 存档兼容：v1→v2→v3、损坏、版本过新、空间不足、跨标签页冲突；导出原始数据/重置路径。
  - 部署与演示说明、环境变量说明、无 Key 演示路径。
  - 加载/空态/错误态最终检查；演示脚本与比赛交付清单。
- 公共接口：不新增；只允许修复性变更，接口变更必须回写文档。
- 明确不做：新增玩法或数值、登录/云同步、正式 UI 之外的品牌重设计、V2 饰品。
- 最小验收：全新用户与老存档用户都能完成主流程；无 Key 可演示；所有错误路径有可理解提示；演示脚本可复现。
- 建议分支：`feature/integration-release`。

### V2：饰品装扮模块（V1 稳定后独立启动）

- 前置：V1 阶段八完成且用户明确批准启动；`CharacterView.appearance` 与只读性格查询已在 `main`。
- 范围：独立饰品模块、饰品状态与永久历史、按性格与成长事件决定表现、穿戴/回收规则、必要 UI。
- 约束：只读性格与事件；只通过外观白名单渲染；不改性格分数、不改行为规则、不写性格内部状态；新增独立字段与迁移，不复用 `legacy`。
- 明确不做：在 V1 分支提前实现；把饰品作为性格成长奖励的必需条件；点数/货币/商城。
- 建议分支：`feature/decoration-system`。

## 3. 占位与真实实现边界

| 阶段 | 允许占位 | 必须真实 |
| --- | --- | --- |
| 阶段二 | 描述文案可先候选 | 五维台账、幂等、纠正替换、单日上限、主导选择、v3 迁移 |
| 阶段三 | 动作可先用简化图形/几何占位 | 主导池选择、确定性、最低占比、防连续、隐藏暂停、互动不加分 |
| 阶段四 | 离线事件文案可先候选 | 时间窗口、幂等、无分数变化、无惩罚、有界事件、保存后展示 |
| 阶段五 | 问候文案可先候选 | 阈值判定、一次触发、刷新不重复、回答不加分、无负罪感 |
| 阶段六 | mock Provider 仅测试 | 请求校验、降级、密钥隔离、限流/超时、用户确认 |
| 阶段七 | 形象细节可迭代 | 原创性、可辨认表情/主导行为、图层白名单、低动态 |
| 阶段八 | 演示数据可准备 | 迁移、恢复、错误提示、无 Key 主流程 |

占位必须明确标识，不得描述为真实模型、真实美术或已获批准的设计。

## 4. 分支任务卡约定

每个阶段分支开始前填写 [MODULE_TASK_CARD](MODULE_TASK_CARD.md)，至少包含：

- 阶段、分支名、前置依赖；
- 模块归属与输入/输出；
- 新增/修改的公开契约（没有则写「无」）；
- 内部状态所有权与配置版本；
- 明确不做；
- 最小验收与演示影响。

任务卡内容写入 PR 描述或分支首个文档提交；未填写的 PR 不得进入审核。跨阶段或跨模块变更必须拆分为独立任务卡，不得合并成一次大改。

## 5. 完成判据

一个阶段只有同时满足以下条件才算完成：

1. 任务卡范围内的功能可运行，最小验收通过；
2. 公共契约与文档同步，没有未记录的接口漂移；
3. 旧存档与失败路径已验证（涉及存档时）；
4. PR 面向 `main`，说明实际变更、验证结果、未验证部分与外部限制；
5. 用户审核通过并明确授权合并。**审核通过不等于合并授权**。

## 6. 旧规划与新阶段映射

| 旧阶段/机制 | 新位置 | 说明 |
| --- | --- | --- |
| P2 情绪识别 | 阶段六 | 基础已在 PR #10 实现，改为复核与真实接入 |
| P3 自主行为/共鸣 | 阶段三 | 保留确定性行为与情绪反馈；世界成长不做 |
| P4 装饰与成长 | 阶段二 + V2 | 五维性格进入 V1；装饰后置 V2 |
| P5 完整度/兼容 | 阶段八 + 阶段七 | 演示与兼容归阶段八，视觉归阶段七 |
| P6 演示 | 阶段八 | — |
| C1 三维护账 | 阶段二 | 重构为五维，旧数据只读兼容 |
| C2 AI 识别 | 阶段六 | 已完成基础实现 |
| C3 自主生活 | 阶段三 + 阶段四 | 行为调度归阶段三，离线生活归阶段四 |
| C4 即时共鸣 | 阶段三 | 只保留保存后一次性情绪反馈 |
| C5 装饰系统 | V2 | 不属于 V1 |
| C6 集成发布 | 阶段八 | — |
| UI 视觉阶段 | 阶段七 | 需用户重新确认视觉方向 |
| 旧五维草案（活泼/勇敢/温柔/敏感/好奇） | 不作迁移来源 | 从未在 `main` 实现；新五维见产品规格 §4 |
