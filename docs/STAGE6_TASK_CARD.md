# 任务卡：阶段六 AI 情绪识别复核与主流程整合（分支 feature/emotion-ai-review）

### 归属与目标

- 阶段：阶段六 AI 情绪识别复核与主流程整合
- 模块：emotion（服务端 Provider、`/api/emotion`、客户端识别会话与确认交互）
- 一句话目标：AI 只产生可确认的情绪建议；请求/响应可关联、过期结果不污染手选或正式存档，无 Key 与所有失败路径都能用手选完成保存。
- 对应 Issue / PR：PR #23（面向 `main`，不自动合并）。

### 输入与输出

- 输入：客户端 `EmotionApiRequest`（`schemaVersion`、`requestId`、`entryId`、`inputRevision`、`text`）；服务端环境配置；用户采纳、修改或手动选择。
- 输出：匹配原请求三元组的 `EmotionApiResponse`；经严格校验的 `Analysis` 建议；用户确认后的 `EmotionReading` 与既有 `CONFIRM_ENTRY` / `CORRECT_EMOTION` 事件。
- 状态所有权：客户端只持有识别会话与建议（运行时内存）；服务端只持有进程内频率/并发/预算计数；正式情绪、性格与存档仍只由 `AppProvider` 经 `applyGameEvent` 与成功保存更新。本阶段不新增持久状态。

### 公共契约

- 新增契约：无（不新增存档字段、不升级 `schemaVersion`）。
- 修改契约：无。`EmotionApiRequest`、`EmotionApiResponse`、`EmotionSuggestion`、`validateAnalysis` 的既有字段与版本保持不变；只加强消费端校验与错误映射。
- 消费的既有契约：`Analysis`、`AnalysisMeta`、`EmotionReading`、`CONFIRM_ENTRY`、`CORRECT_EMOTION`、`applyGameEvent`、`StoragePort`。
- 禁止跨越：AI 不得决定性格分数、主导判定、行为、离线生活或久别重逢；客户端不导入服务端 Provider；服务端不导入游戏写入模块。

### 配置与版本

- 配置文件：`src/lib/ai/server/config.ts`、`src/lib/ai/server/questions.ts`、`src/lib/ai/server/protection.ts`；`.env.example`。
- 规则版本：内部映射仍为 `bailian-emotion-v1`；模型识别 `decision-model-preview`；不改变性格/行为/离线/重逢规则版本。
- 可调参数：`AI_TIMEOUT_MS=15000`（固定契约）、`AI_MAX_INPUT_CHARS=30000`、`AI_MAX_BODY_BYTES=33554432`、`AI_RATE_LIMIT_PER_MINUTE=10`、`AI_MAX_CONCURRENT=2`、`AI_CALL_BUDGET=200`；低置信度提醒阈值保持 0.6，不擅自修改。

### 依赖与边界

- 前置依赖：阶段二～五已合入 `main`（PR #18、#19、#20、#22）；`AI_CONTRACT` v1 稳定。
- 明确不做：阶段七 UI、V2 饰品、登录/数据库/微服务、Agent 框架、多模型编排、自动重试、自动截断正文、修改评分/主导/行为/离线/重逢参数。
- 占位与真实：mock Provider 仅用于明确标识的测试/演示，默认使用真实百炼 Provider；没有 `MODEL_API_KEY` 与 `BAILIAN_WORKSPACE_ID` 时如实记录真实 API 未验证。

### 最小验收

- [x] 成功与失败响应都校验 `requestId`、`entryId`、`inputRevision`；三元组不匹配的旧响应被忽略。
- [x] 旧成功/旧失败响应不覆盖新草稿、新建议或用户已手选的情绪；正文编辑、手选、重新识别、保存、取消使旧会话失效。
- [x] 客户端超时提示 `AI_TIMEOUT`，不自动重试；服务端 400/413/429/502/503/504 与异常上游响应映射到契约错误码。
- [x] AI 建议不自动写入草稿或正式存档；采纳与修改分离；低置信度与 `unknown` 明确提醒；修改建议使用 `source=corrected`、`confidence=null`；无建议时手选 `source=manual`。
- [x] 已保存记录重识别绑定正文与修订号，过期结果不能提交纠正；纠正只经 `CORRECT_EMOTION` 替换贡献，不重复计分。
- [x] 保存失败保留草稿与旧正式状态；AI 与手选都进入同一套确定性性格结算。
- [x] 无 Key、预算耗尽、限流、并发、超时、非法输出均保留完整日记并允许手选保存。
- [x] 服务端不向客户端、日志或存档泄露 Key、原生响应与错误详情；进程内保护的部署局限如实记录。
- 验证方式：阶段六规则测试 + 既有阶段二～五回归 + typecheck/lint/build + 一次浏览器主流程冒烟。
- 未验证项：真实百炼账号调用（缺少 `MODEL_API_KEY` 与 `BAILIAN_WORKSPACE_ID`）；多实例公开部署的平台层限流。

### 验证记录（2026-11-13）

- `npx --no-install tsx tests/stage6-client.ts`：通过。覆盖成功/失败三元组不匹配、旧成功与旧失败响应、严格 analysis/analysisMeta、`needsConfirmation`、HTTP 状态映射、会话失效与旧建议绑定。
- `NODE_OPTIONS=--conditions=react-server npx --no-install tsx tests/stage6-server.ts`：通过。覆盖原生响应合法映射与 12 类非法响应、请求校验、mock/real Provider 请求结构、上游 401/413/429/500/非法 JSON/额外字段、预算/频率/并发、15 秒响应体读取超时、日志仅含固定结果码与耗时。
- `npm run typecheck`、`npm run lint`、`npm run build`：通过。
- 阶段二～五既有测试：全部通过。
- 浏览器冒烟（`AI_PROVIDER_MODE=mock` 明确标注演示数据）：手选保存、AI 建议展示但不自动选中、编辑正文使旧建议消失、显式采纳后保存为 AI、历史纠正为手动纠正、刷新后存档与主导描述保持；结束后恢复默认真实 Provider 模式。
- 未验证：真实百炼 8–12 条中文样例（缺 `MODEL_API_KEY` 与 `BAILIAN_WORKSPACE_ID`）；多实例公开部署平台层限流。

### 存档与迁移

- schema 变化：无（保持 `schemaVersion` 3）。
- 迁移策略：不涉及。
- 失败处理：保存失败不结算；AI 失败不修改情绪、日记正文与正式状态。

### 风险与待确认

- 进程内频率/并发/预算仅在单实例内有效；多实例公开部署必须由部署平台叠加同等保护，本阶段不引入数据库或复杂限流基础设施。
- 置信度 0.6 为暂定提醒阈值，不在缺少真实样本时调整。
- `decision-model-preview` 为预览模型；真实账号开通、Workspace 与地域仍需具备凭证后验证。
