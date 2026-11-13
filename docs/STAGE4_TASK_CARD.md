# 阶段四任务卡：离线自主生活

## 任务卡：offlineLife / storage（分支 feature/offline-life）

### 归属与目标
- 阶段：阶段四 离线自主生活
- 模块：offlineLife（应用层会话启动与 checkpoint 归属 application；持久化经 storage）
- 一句话目标：用户再次打开 ShiXu 时，按最后一次有效活动与当前主导性格生成有限、确定性的离线生活事件并最小展示；不运行后台 Agent、不改五维、不惩罚、不伪造日记。
- 对应 Issue / PR：面向 main 的阶段四 PR（本分支）。前置阶段三 PR #19 已合并。

### 输入与输出
- 输入：只读 `offlineLife.lastActiveAt ?? lastVisitAt`（基准）、`now`、`PersonalitySnapshot.dominantId`、`offline-life-v1` 配置、显式确定性种子（由 `hash(windowStart, dominantId, rulesVersion, index)` 派生）；应用层 `ACTIVITY_CHECKPOINT`（pagehide/隐藏/可见周期 ≤5 分钟）与正式日记保存。
- 输出：`planOfflineLife` 纯函数返回 `OfflineLifePlan`（events、windowStart、nextLastVisitAt、nextLastActiveAt）；`SESSION_STARTED` 经 `applyGameEvent` 原子写入 `offlineLife`（与 `reunion` 预留标记）；保存成功后陪伴页最小文字展示本次与历史离线事件。
- 状态所有权：offlineLife 拥有 `lastVisitAt / lastActiveAt / lastWindowStart / events`（通过 v3 快照持有）；不拥有性格台账、日记正文、情绪、回忆、行为调度与渲染状态。`reunion` 字段本阶段只写不触发的合法值，不实现重逢业务。

### 公共契约
- 新增：`OfflineLifeEvent`、`OfflineLifeState`、`OfflineActivity`、`OfflineLifeRuleConfig`、`OfflineLifePlanInput`、`OfflineLifePlan`、`planOfflineLife`（src/domain/offlineLife.ts）；`OFFLINE_LIFE_V1`（src/config/offlineLife.ts）；领域事件 `ACTIVITY_CHECKPOINT`（`ActivityCheckpointEvent`）、`SESSION_STARTED`（`SessionStartedEvent`）。
- 修改：`Snapshot.offlineLife.events` 由 `unknown[]` 收紧为 `OfflineLifeEvent[]`（`offlineLife` 整体改用 `OfflineLifeState`）；`GameEvent` 联合新增两事件；`applyGameEvent` 对 `CONFIRM_ENTRY / EDIT_ENTRY_TEXT / CORRECT_EMOTION` 顺带把 `offlineLife.lastActiveAt` 单调推进到 `context.now`；`ACTIVITY_CHECKPOINT` 不查/不写 `appliedEventIds`、不写回忆，单调 `max`；`SESSION_STARTED` 按 `eventId` + `windowStart==baseline` + 事件 `id` 去重，裁剪到 `maxStoredEvents`。schema 校验新增 `events` 数量上限。均同步 ARCHITECTURE §4.4/§5.1/§6。
- 消费的既有契约：`PersonalitySnapshot`/`derivePersonality`/`getPersonalityRule`（personality，只读 dominantId）、`StoragePort.load/save`（签名不变）、`applyGameEvent`/`createInitialSnapshot`（rules）、`GameContext`（now/dayKey）。
- 禁止跨越：离线模块不读贡献账本、不写 `personality`/`entries`/`memories`；不实现重逢台词/触发状态机；组件只读已落盘事件，不决定离线事件；存储不决定事件。

### 配置与版本
- 配置文件：src/config/offlineLife.ts
- 规则版本：offline-life-v1；不提升 `schemaVersion`（仍 v3），不影响旧存档结构。
- 可调参数（候选，PR 标注「参数待验收」）：minAbsenceMs 30 分钟、eventIntervalMs 90 分钟、maxEventsPerWindow 6、maxStoredEvents 20；五主导活动池 id/label/text/weight。
- 活动文案为候选占位（ROADMAP §3 允许离线文案先候选），非定稿美术/文案。

### 依赖与边界
- 前置依赖：PR #19 已合入的主导行为引擎与 `PersonalitySnapshot` 只读契约；PR #18 的 v3 存档、五维台账与迁移；阶段一保存/恢复/跨标签页冲突路径。
- 明确不做：后台持续 Agent、离线成长/衰减/积分/奖励、因长期未登录增加 low_mood、饥饿/死亡/掉级惩罚、饰品/装扮/商城/资源、阶段五久别重逢（问候/台词/回答/跳过/触发状态机/AI 实时生成）、页面与小白人重设计、无关重构。
- 占位与真实：真实＝时间窗口与基准、确定性加权选择、事件/窗口幂等、checkpoint 单调、保存后展示、无分数变化、有界事件、迁移空时间不伪造历史；占位＝离线活动文字（候选）。

### 最小验收
- [x] 首次打开/迁移存档 baseline=null，不生成过去的生活。
- [x] absence < minAbsenceMs 不生成事件；正常离线生成符合当前主导性格的活动。
- [x] 五主导各有独立活动池；事件 activityId 属于当前主导池。
- [x] 相同输入/窗口/规则版本生成完全相同结果；事件时间升序、occurredAt ≤ now、数量 ≤ maxEventsPerWindow。
- [x] 重复 SESSION_STARTED（同 eventId / 同 windowStart / 同事件 id）不重复追加；刷新、同标签页刷新、StrictMode 重复 effect、多次初始化不重复。
- [x] 重复/乱序/重放 ACTIVITY_CHECKPOINT 不倒退 lastActiveAt、不写回忆/appliedEventIds。
- [x] 同标签页刷新经 sessionStorage 救援值不误判离线；救援值不替代正式存档、不破坏版本检查与跨标签页冲突保护。
- [x] 存储失败不展示未提交事件、不留半写状态；恢复重试不产生重复事件。
- [x] 离线前后五维分数完全不变；low_mood 不因离线增加；不写日记/回忆/奖励。
- [x] 日记保存、性格、行为、互动、刷新恢复无回归（stage2/stage3 复跑）；临时体验不误写正式存档。
- [x] P1 修复：pending 日记未解决时暂停正式 checkpoint（含周期/隐藏/pagehide），成功提交或明确取消后恢复；重试复用冻结 eventId/entryId/now/dayKey/正文/情绪；跨标签页冲突保护不被绕过；救援与最后成功 checkpoint 降级语义不变。回归 `tests/stage4-checkpoint.ts`（零依赖最小 DOM shim 渲染 AppProvider，覆盖保存失败→checkpoint→恢复重试、隐藏/pagehide、取消恢复、不重复结算、真实跨标签页冲突 5 场景；含移除守卫的负向验证）。
- [x] P1 修复：会话启动 `SESSION_STARTED` 保存失败后冻结未提交窗口（事件、windowStart、now）；后续 checkpoint / 日记保存先把该窗口合入同一候选快照再原子提交，不得单独推进 `lastActiveAt`；存储恢复后由 checkpoint 或 `retrySave` 补交；离线事件仅在正式存档包含该会话事件后展示；窗口幂等与 revision 冲突检查不变。回归 `tests/stage4-session-retry.ts`（预置 5 小时离线窗口 + 首次会话保存失败，覆盖 checkpoint 补交、日记保存补交、日记失败后 retry、刷新不重放 4 场景；含移除补交逻辑的负向验证）。
- 验证方式：`npx --yes tsx tests/stage4.ts` + `npx --yes tsx tests/stage4-checkpoint.ts` + `npx --yes tsx tests/stage4-session-retry.ts` + stage2/stage3 复跑 + 一次 typecheck/lint/build + 浏览器最小冒烟。
- 未验证项：真实百炼 API（阶段六）；正式视觉（阶段七）；候选参数产品验收；pagehide 异步落盘在真实浏览器关闭时序下的成功率（按救援值降级，不宣称精确）。

### 存档与迁移
- schema 变化：无（仍 v3）。`offlineLife.events` 类型收紧为 `OfflineLifeEvent[]`，结构不变。
- 迁移策略：v2→v3 已建 `offlineLife={lastVisitAt:null,lastActiveAt:null,lastWindowStart:null,events:[]}`；首次会话不生成过去的生活；entries/正文/情绪/纠正/legacy 原样保留。
- 失败处理：保存失败不更新正式 lastVisitAt/lastActiveAt/事件、不展示；下次打开按同一窗口重新生成相同事件；损坏/版本过新保留 raw 导出/重置；checkpoint 失败降级为最后成功 lastActiveAt（或救援值），可能高估离线但不少算。

### 风险与待确认
- minAbsenceMs/eventIntervalMs/maxEventsPerWindow/maxStoredEvents 与活动文案均为候选，待用户验收。
- pagehide 异步保存不保证完成：以 sessionStorage 同步救援值 + 最后成功 checkpoint 降级，不引入后台心跳/高频写盘。
- 救援值仅在会话成功启动后写入，避免「会话启动保存失败后刷新」丢失真实离线窗口。
- `reunionTriggered` 本阶段恒为 false（合法不触发值），阶段五复用本阶段形成的 lastActiveAt/lastVisitAt/lastWindowStart 契约。
- P2（非阻塞，已登记 Issue #21）：`SESSION_STARTED` 每次成功会话都向 `appliedEventIds` 追加 `session:` eventId，长期无界增长且对幂等冗余（`windowStart===baseline` 前置校验已保证幂等）。最小修复会改动 ARCHITECTURE §5.1 已记录的幂等契约，需独立任务卡 + 契约同步 + 用户批准，不在本 PR 实施；严禁盲目删除 `evt:` 日记 eventId。