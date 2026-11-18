# 任务卡：阶段八 S8-03G 阿里云百炼 Edge Function 接入

> 状态（2026-11-18）：**本地实现与模拟验证完成，未部署、未调用真实百炼、未修改站点 Secrets 或线上站点**。
>
> 分支：`feature/stage8-edge-ai`（基于 `origin/main` `982f512`）；PR 指向 `main`，保持 Draft，是否合并由用户决定。
>
> 关联：[AI_CONTRACT](AI_CONTRACT.md)、[ARCHITECTURE](ARCHITECTURE.md)、[STAGE8_TASK_CARD](STAGE8_TASK_CARD.md)、[S8-03 部署预检](STAGE8_S8-03_DEPLOY_PRECHECK.md)。

## 1. 任务卡字段

### 归属与目标

- 阶段：阶段八 S8-03 的 AI 子项；不新增领域模块。
- 模块：`emotion`（AI 情绪识别的部署适配）；仍只输出情绪建议，不接触性格、主导、行为、离线、重逢或存档写入。
- 目标：让 Qoder Sites 静态部署版本通过 `/functions/v1/app` 调用百炼 `decision-model-preview`，复用现有 `EmotionApiRequest` / `Analysis` / envelope 契约与九类情绪、VAD、严格校验；本地 Next.js `/api/emotion` 保持可用。
- 对应 PR：Draft PR（本分支创建后补链接）。

### 输入与输出

- 输入：客户端 `EmotionApiRequest`（`schemaVersion`、`requestId`、`entryId`、`inputRevision`、`text`）；服务端 Secrets 与限额配置。
- 输出：现有 `EmotionApiSuccess`（`analysis`、`needsConfirmation: true`、可选 `analysisMeta`）或固定错误码 `EmotionApiFailure`；三元组从请求复刻。
- 状态所有权：无新增持久状态。Edge/Next 保护计数只在实例/进程内存；不拥有快照、性格、行为、离线、重逢、愿望或 UI 状态。

### 公共契约

- 新增契约：`POST /functions/v1/app`，请求/响应字段与 `/api/emotion` 完全一致；未新增 `Analysis` 或 envelope 字段。
- 修改契约：客户端按构建模式选择端点；错误码、状态码、三元组、`needsConfirmation` 与 `analysisMeta` 语义不变。
- 消费的既有契约：`EmotionApiRequest` / `EmotionApiSuccess` / `EmotionApiFailure`、九类 `EmotionLabel`、`bailian-emotion-v1` 映射。
- 禁止跨越：AI 不得写性格、主导、行为、离线、重逢、快照或愿望；Edge 不导入游戏写入模块。

### 配置与版本

- 配置文件：`functions/config.ts`（Deno Secrets）、`src/lib/ai/server/config.ts`（Node `.env`）、`.env.example`。
- 规则版本：`bailian-emotion-v1` 不变；不追溯改写历史。
- 可调参数：`AI_EDGE_ENABLED`（默认 0，必须显式 1）、`AI_MAX_INPUT_CHARS`（30000）、`AI_EDGE_MAX_BODY_BYTES`（1 MiB，最多 4 MiB）、`AI_RATE_LIMIT_PER_MINUTE`（10）、`AI_MAX_CONCURRENT`（2）、`AI_CALL_BUDGET`（100）。这些是运行时保护参数，不是游戏数值。

### 依赖与边界

- 前置依赖：`origin/main` `982f512`（PR #54 已合入）；阶段六共享 AI 契约与测试。
- 明确不做：不部署/发布/修改线上站点或 Secrets；不调用真实百炼；不新增数据库、登录、云同步；不改存档、评分、行为、企鹅视觉或 UI。
- 占位与真实：本地测试使用模拟上游与注入 Provider，明确不是真实百炼；Edge 生产入口固定真实 Provider，不提供 mock。

### 最小验收

- [x] 正常建议返回与 `/api/emotion` 兼容的 envelope，且 `needsConfirmation=true`。
- [x] 客户端会话可接受 Edge 响应；严格字段/概率校验失败进入手选降级。
- [x] 关闭开关、缺 Key、413、429、503、504 与上游错误均不写状态、不影响手选。
- [x] 静态构建请求 `/functions/v1/app`，常规构建请求 `/api/emotion`。
- [x] 阶段六服务端/客户端回归未回退。
- 验证方式：`tests/stage8-edge-ai.ts`、`tests/stage6-server.ts`、`tests/stage6-client.ts`、typecheck、lint、常规构建与静态导出。
- 未验证项：`deno check`、Edge 实际运行时、平台 Secrets、真实百炼、跨实例预算。

### 存档与迁移

- schema 变化：无；仍为 `Snapshot` v4 + `shixu.wishes.v1`。
- 迁移策略：无。
- 失败处理：识别失败只返回固定错误码；不改变草稿、存档或成长；手选保存路径不变。

### 风险与待确认

- Edge 真实调用默认关闭；启用前需用户授权、低预算窗口与账号侧配额告警。
- 实例内存计数不是全局预算；长期公开启用前需平台限流或数据库原子预算。
- Qoder Edge 出网、时长、内存与请求体上限未实测。

## 2. 平台事实（2026-11-18 核实）

依据本机 Qoder Sites Skills 与本机打包器源码，不依赖外部推断：

| 项目 | 事实 |
| --- | --- |
| 服务端形态 | 单个 Edge Function；打包为 `runtime/app.zip`，入口 `index.ts` 位于 ZIP 根，逻辑名 `app`，`runtime: "edge"` |
| 对外路径 | `/functions/v1/app`；逻辑子路径受支持，但网关会替换函数名段，函数不得依赖完整 pathname 含 `app` |
| 运行时 | Deno；必须实现 HTTP handler（如 `Deno.serve`），不能启动常驻进程或 Node 服务 |
| 依赖 | 相对导入必须带显式扩展名；打包器不解析 TypeScript path alias、不安装依赖、不变换 Node 专有模块 |
| Secrets | `prepare_site.secretNames` 声明，运行时用 `Deno.env.get` 读取；值只通过 Portal 专用输入写入，不进入源码、构建变量或前端产物 |
| 数据库 | 默认 `none`；启用需授权后端分配与 `schemaRef`，不属于本轮 |
| 平台限流/预算 | Skills 与打包器未提供按路由的频率限制、并发上限或 API 调用预算参数；Gateway 只负责站点访问控制与同源写入检查 |
| 静态产物命名空间 | `/api`、`/functions`、`/storage` 等为平台保留；应用 API 不能放在 `/api` |

结论：平台没有可供应用声明的原生“全局调用预算”。实例内内存计数会随冷启动/多实例失效，不能冒充全局预算。因此真实模型调用必须默认关闭，直到有可靠的成本边界。

## 3. 实现结构

### 3.1 共享 AI 核心（唯一定义）

`functions/shared/` 同时被 Next Route 与 Edge Function 导入，不复制第二套识别逻辑：

| 文件 | 责任 |
| --- | --- |
| `emotion-types.ts` | 九类标签、`EmotionDimensions`、`Analysis`、`AnalysisMeta`；`src/domain/types.ts` 改为从这里再导出 |
| `contract.ts` | `EmotionApiRequest`、错误码与固定文案、成功/失败 envelope；`src/lib/ai/contract.ts` 从这里再导出 |
| `questions.ts` | 五问 Choice/Score 定义 |
| `native.ts` | 百炼原生响应白名单校验、`bailian-emotion-v1` 映射、`Analysis` 严格校验、mock 构造 |
| `provider.ts` | System One 调用、超时、上游错误分类；密钥由调用方注入 |
| `protection.ts` | 实例内频率/并发/预算工厂，不提供跨实例保证 |
| `handler.ts` | 请求方法/内容类型/请求体/正文长度校验、Provider 调用、严格输出校验、固定错误码与三元组回显 |
| `config.ts` | 配置解析纯函数（base URL、正整数、默认模型名） |

`functions/shared/` 不导入 `server-only`、`process.env`、Node 内置模块或 `@/` 别名，可直接进入 Edge 包。

### 3.2 Next.js 适配层

- `src/app/api/emotion/route.ts`：只负责读取 Node 配置、映射为共享 `EmotionRuntimeConfig`、调用 `handleEmotionRequest`；行为与阶段六一致。
- `src/lib/ai/server/provider.ts`：保留 `server-only` 边界，再导出共享 Provider。
- `src/lib/ai/server/{native,questions,protection}.ts`：删除，避免两份实现。
- `src/lib/ai/endpoint.ts`：静态导出构建使用 `/functions/v1/app`，常规 Next 构建使用 `/api/emotion`。

### 3.3 Edge Function

- `functions/index.ts`：创建实例级保护，`Deno.serve` 每请求读取一次配置并调用共享 handler。
- `functions/config.ts`：`Deno.env.get` 读取 `MODEL_API_KEY`、`BAILIAN_WORKSPACE_ID`、`MODEL_BASE_URL`、`MODEL_NAME` 与限额；`AI_EDGE_ENABLED !== "1"` 时直接 `503 AI_UNAVAILABLE`，不触网。
- Edge 生产入口固定真实 Provider，不提供 mock 模式，避免部署环境误展示演示数据。

## 4. 成本与接口保护

### 4.1 本轮已实现

| 保护 | 行为 |
| --- | --- |
| 默认关闭 | 必须显式设置 `AI_EDGE_ENABLED=1`；否则有效请求返回 `503 AI_UNAVAILABLE`，Provider 不被调用 |
| Secret 隔离 | Key/Workspace 只经 `Deno.env.get` 读取；不写入响应、日志、静态产物或前端 |
| 正文长度 | 默认 `AI_MAX_INPUT_CHARS=30000`，超限 `413 INPUT_TOO_LONG` |
| 请求体大小 | Edge 默认 `AI_EDGE_MAX_BODY_BYTES=1 MiB`，上限收紧到 4 MiB；超限不解析正文 |
| 超时 | 15 秒覆盖获取响应头与读取响应体；`504 AI_TIMEOUT` |
| 单次调用 | 不自动重试；上游 401/403/404 → `503`，413 → `413`，其余 → `502` |
| 实例内频率 | 默认 10 次/分钟；超限 `429 AI_RATE_LIMITED` |
| 实例内并发 | 默认 2；超限 `429 AI_RATE_LIMITED` |
| 实例内预算 | 默认 100 次；耗尽 `503 AI_UNAVAILABLE` |

以上计数均为**单 Edge 实例内存**，冷启动重置、多实例不共享，不能当作全局预算。

### 4.2 平台原生能力结论

Qoder Sites 当前未提供应用可配置的按路由限流、全局并发或调用预算。站点保持私有可降低暴露面，但仍是访问控制，不是费用上限。把实例内存计数描述为全局预算属于错误结论，本轮明确不做。

### 4.3 持久化全局预算的最小研究方向（未实现）

若后续需要可靠的全局预算，最小方案是 Qoder Sites Function backend 数据库 + 原子计数：

1. `ensure_backend` 分配后端，创建单表（如 `ai_usage`：日期、计数、更新时间）。
2. 通过原子 RPC（`INSERT ... ON CONFLICT DO UPDATE SET count = count + 1 RETURNING count`）在调用上游前预占一次；失败则不调用。
3. `prepare_site` 声明 `databaseAccess: "read_write"` 与同一 `projectId` 的 `schemaRef`。
4. 预算按 UTC/北京日期重置，并保留人工关闭开关。

该方案会新增云端持久化资源、迁移与部署依赖，且需要用户授权；本轮不实施，也不替换拾绪现有 localStorage 数据架构。单纯“先读后写”不是原子限额，不能作为严格预算。

## 5. 产品边界

- AI 只返回 `analysis` 建议且 `needsConfirmation: true`；用户确认后才进入草稿或纠正。
- AI 不写五维分数、不决定主导、不选择行为/特殊动作、不生成离线生活或久别重逢、不写正式存档。
- 手选情绪始终独立可用；Edge 关闭、缺少 Secret、超时、限流或上游失败均只影响识别，不影响手选保存完整正文。
- 未修改存档结构、评分规则、行为权重、企鹅视觉或正式 UI。

## 6. 已执行验证

| 验证 | 方式 | 结果 |
| --- | --- | --- |
| 类型检查 | `npm run typecheck` | 通过 |
| Lint | `npm run lint` | 通过 |
| 常规构建 | `npm run build` | 通过；`/api/emotion` 仍为动态 Route Handler |
| 静态导出 | `npm run build:export` | 通过；RSC 分段归一化 6 个文件；产物中无 `/api/emotion` 引用，客户端常量折叠为 `/functions/v1/app` |
| Edge 本地回归 | `npx --yes tsx tests/stage8-edge-ai.ts` | 通过：正常建议、客户端确认、严格校验、五类 Provider 错误、默认关闭、缺 Key、413、429、并发、503 预算、405/400、超时 504、端点选择、默认关闭入口 wiring |
| 阶段六服务端回归 | `npx --yes tsx --conditions=react-server tests/stage6-server.ts` | 通过：Node Route 重构后 Provider/校验/错误码/超时/保护未回退 |
| 阶段六客户端回归 | `npx --yes tsx tests/stage6-client.ts` | 通过：三元组、过期响应、严格字段与错误映射未回退 |
| 常规模式冒烟 | `next start` + `AI_PROVIDER_MODE=mock` POST `/api/emotion` | 200，返回 `analysisMeta.provider=bailian-mock`，`needsConfirmation=true` |
| 静态端点 | 检查 `out/_next/static/chunks` | 请求 URL 为 `/functions/v1/app` |

以上均为本地模拟上游/注入 Provider/桩 `Deno.serve`，**不是真实百炼调用，也不是 Qoder Sites Edge 运行时验收**。

## 7. 未验证与风险

| 项 | 状态 |
| --- | --- |
| `deno check` / Deno 运行时执行 | 本机未安装 Deno，未执行；测试通过 tsx 与 Node 模拟入口 wiring |
| Qoder Sites Edge 实际部署 | 未执行 `prepare_site`/`publish_site`，未创建或修改站点 |
| Qoder Edge 出网、冷启动、内存、请求体与函数时长上限 | 未实测；15 秒超时可能受平台更短时限影响 |
| 跨实例限流/预算 | 不保证；实例内存计数会重置且不共享 |
| 真实百炼账号、Key、Workspace、地域与模型可用性 | 未验证；本轮禁止真实付费请求 |
| 静态站点发布后的 AI 可用性 | 未验证；需要部署 Function 并配置 Secrets 后才能验收 |
| 站点 Secrets | 未创建、未修改 |

## 8. 首次真实调用的最小方案（待用户授权）

1. 保持 `AI_EDGE_ENABLED=0`，先只发布/更新私有草稿，确认四页与手选流程不受影响。
2. 在 Portal Settings 中准备 Secrets：`AI_EDGE_ENABLED`、`MODEL_API_KEY`、`BAILIAN_WORKSPACE_ID`、可选 `MODEL_BASE_URL`/`MODEL_NAME`；阈值先用 `AI_CALL_BUDGET=20`、`AI_RATE_LIMIT_PER_MINUTE=3`、`AI_MAX_CONCURRENT=1`、`AI_EDGE_MAX_BODY_BYTES=262144`。
3. 先确认静态站点访问仍为私有，或限制到可信评审范围；私有访问不是费用上限，只降低暴露面。
4. 使用 8–12 条带人工预期标签的简短中文样例，逐条手动点击识别并确认；不写自动化循环调用。
5. 记录每次结果码、耗时与人工判断，不记录正文、Key、原生 answers 或 usage；完成后立即把 `AI_EDGE_ENABLED` 改回 `0`。
6. 费用控制建议：百炼账号侧设置配额/告警；Edge 侧保持低预算与低并发；不自动重试；若需要长期公开 AI，先完成数据库原子预算或平台限流方案，再开启。

## 9. 部署参数（本轮未执行）

```json
{
  "functionDirectory": "functions",
  "secretNames": [
    "AI_EDGE_ENABLED",
    "MODEL_API_KEY",
    "BAILIAN_WORKSPACE_ID",
    "MODEL_BASE_URL",
    "MODEL_NAME",
    "AI_MAX_INPUT_CHARS",
    "AI_EDGE_MAX_BODY_BYTES",
    "AI_RATE_LIMIT_PER_MINUTE",
    "AI_MAX_CONCURRENT",
    "AI_CALL_BUDGET"
  ],
  "databaseAccess": "none",
  "spa": false
}
```

`prepare_site` 只打包文件，不执行构建；仍需先 `npm run build:export`。Secret 值必须在 Portal 专用输入中填写，不能出现在工具参数、聊天、源码或构建变量。

## 10. 明确不做

- 不部署、不发布、不修改现有私有站点或 Secrets。
- 不发起真实付费百炼请求，不修改百炼账号配置。
- 不新增数据库、登录、云同步、跨设备存档或 V2 饰品。
- 不修改五维评分、主导判定、行为池/权重、特殊行为、企鹅视觉、正式 UI、`Snapshot` v4 或愿望存储。
- 不把实例内存计数描述为全局预算，不把 mock/本地桩描述为真实联调。
