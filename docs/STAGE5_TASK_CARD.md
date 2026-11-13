# 阶段五任务卡：久别重逢

## 任务卡：reunion / application / companion（分支 feature/reunion）

### 归属与目标
- 阶段：阶段五 久别重逢（前置阶段四 PR #20 已合入 `main`）
- 模块：reunion（领域与配置）；会话启动、失败补交与一次性展示归属 application（`AppProvider`）；最小展示归属 companion 页面
- 一句话目标：用户超过候选阈值未使用 ShiXu 后再次打开，小白人按当前主导性格主动问候一次「最近过得还好吗？」，回答或跳过都不产生性格贡献；保存失败时不展示，刷新不重复。
- 对应 Issue / PR：面向 `main` 的阶段五 PR（本分支）

### 输入与输出
- 输入：显式 `now`、`offlineLife.lastActiveAt ?? lastVisitAt`、可选同标签页救援时间戳、`PersonalitySnapshot.dominantId`、`reunion.lastTriggeredWindowStart`、本次 `planOfflineLife` 已规划事件、`reunion-v1` 配置。
- 输出：`evaluateReunion` 纯函数返回 `ReunionEvaluation`（`triggered`、`windowStart`、`reasonCode`、`absenceMs`、可选 `ReunionGreeting`）；应用层把 `reunionTriggered` 写入同一个 `SESSION_STARTED` 事件，成功保存后把问候放入运行时展示状态。
- 状态所有权：reunion 拥有 `reunion.lastTriggeredWindowStart / lastTriggeredAt`（通过 v3 快照持有，沿用阶段四字段）；application 拥有本次会话的一次性展示与关闭标记（仅内存）；不拥有五维台账、日记正文、情绪、离线事件列表、行为调度与渲染状态。

### 公共契约
- 新增：`ReunionRuleConfig`、`ReunionTemplate`、`ReunionGreeting`、`ReunionEvaluation`、`ReunionEvaluationInput`、`evaluateReunion`（`src/domain/reunion.ts`）；`REUNION_V1`（`src/config/reunion.ts`）。
- 修改：`Snapshot.reunion` 由内联结构改为复用 `ReunionState`（字段不变，schema 仍 v3）；`SESSION_STARTED` 的 `reunionTriggered` 在本阶段开始产生真实值；`applyGameEvent` 仅在 `reunionTriggered && windowStart !== null` 时写入重逢标记；`AppState` 新增运行时 `reunionPrompt` 与本次已处理窗口标记（不持久化）。
- 消费的既有契约：`PersonalitySnapshot.dominantId`、`OfflineLifeState`、`OfflineLifeEvent`、`SESSION_STARTED`、`sessionPendingRef`、`applyPendingSession`、`settlePendingSession`、`StoragePort`。
- 禁止跨越：reunion 不读写 `personality`/`entries`/`memories`/离线事件本身；不调用 AI、网络、`Date.now()`、`Math.random()`；组件不自行判断是否该重逢，只渲染应用层给出的已提交问候。

### 配置与版本
- 配置文件：`src/config/reunion.ts`
- 规则版本：`reunion-v1`；不影响旧存档结构，不提升 `schemaVersion`（仍 v3）。
- 可调参数（候选，PR 标注「参数待验收」）：`thresholdMs = 72 * 60 * 60 * 1000`，严格 `absence > thresholdMs` 才触发。
- 文案（候选，PR 标注「文案待验收」）：五种主导性格各自的通用问候与按离线活动 id 对应的具体问候；基础问句固定「最近过得还好吗？」。

### 依赖与边界
- 前置依赖：阶段四已合入的 `offlineLife.lastVisitAt / lastActiveAt / lastWindowStart`、`SESSION_STARTED` 窗口幂等、失败会话冻结与 checkpoint/日记保存补交、同标签页 `sessionStorage` 救援；阶段二主导性格只读快照；v3 存档与迁移。
- 明确不做：AI 实时生成问候、把回答当情绪日记、回答/跳过加分或发奖励、连续登录奖励、负罪感文案、新的聊天系统、第二套性格机制、正式视觉/动画、页面重设计、阶段四离线算法与候选参数改动、Issue #21 的 `appliedEventIds` 契约调整。
- 占位与真实：真实＝阈值判定、`lastActiveAt ?? lastVisitAt` 基准、同窗口幂等、保存后展示、失败不展示、回答/跳过零结算、刷新不重复、救援防误触发；占位＝问候与回应相关文案（候选）。

### 一次性展示
- 正式状态：`reunion.lastTriggeredWindowStart / lastTriggeredAt` 表示该离线窗口已成功触发。
- 运行时状态：仅当当前运行会话成功提交包含该 `SESSION_STARTED` 的快照后，才激活 `reunionPrompt`；不从旧快照的 `lastTriggeredAt` 反推展示。
- 关闭/回答/跳过只清运行时状态并记录本次已处理窗口；同一窗口在本会话不再展示；刷新后 `lastVisitAt/lastActiveAt` 已推进，不会再次触发。

### 最小验收
- [x] 首次打开（基准为 null）不触发；离线 1 天不触发；恰好 72 小时不触发；72 小时 + 1 毫秒触发。
- [x] 触发基准使用 `lastActiveAt ?? lastVisitAt`；同一次离线窗口只触发一次；相同输入同结果。
- [x] 五种主导性格问候可区分，均含固定基础问句；具体经历只引用本次窗口真实生成事件，无事件时使用通用问候；无禁止的责备/依赖文案。
- [x] `SESSION_STARTED` 保存失败时不展示；checkpoint 或日记保存补交成功后展示一次；日记保存再次失败不展示、`retrySave` 成功后不重复。
- [x] 同标签页刷新经救援时间戳不误触发；StrictMode 重复 effect 不重复展示。
- [x] 跨标签页 revision 冲突/冲突暂停时不提前展示，不覆盖他人存档。
- [x] 回答与跳过不改五维、不写日记/回忆、不写 `appliedEventIds`、不调用情绪 API；关闭后角色回到正常行为。
- [x] 旧存档可读取，v3 结构不变；离线事件、日记、纠正、`legacy` 原样保留；无触发时保留原重逢标记。
- 验证方式：`npx --yes tsx tests/stage5.ts` + `npx --yes tsx tests/stage5-session.ts` + stage4 三项复跑 + 一次 typecheck/lint/build + 浏览器最小冒烟。
- 未验证项：候选阈值与文案的产品验收；真实浏览器关闭时序下 pagehide 落盘成功率；正式视觉（阶段七）；真实百炼 API（阶段六）。

### 存档与迁移
- schema 变化：无（仍 v3）。不新增字段，复用 `reunion`。
- 迁移策略：沿用阶段四 v2→v3 建 `reunion = { lastTriggeredWindowStart: null, lastTriggeredAt: null }`；旧存档无重逢标记时按未触发处理。
- 失败处理：`SESSION_STARTED` 失败不更新任何重逢/离线状态，不展示问候；未提交窗口冻结在 `sessionPendingRef`，由 checkpoint 或日记保存原子补交；补交成功才展示问候。

### 风险与待确认
- `thresholdMs = 72 小时` 为候选参数；五种问候与按离线活动的具体文案为候选文案，均需用户验收。
- 回答内容不持久化；若未来需要“已回答/已跳过”持久化，属于新的产品决定与契约变更，不在本阶段实现。
- 真实浏览器关闭时序无法稳定验证，按阶段四救援值与最后成功 checkpoint 降级处理，不宣称精确。
