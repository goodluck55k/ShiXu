# 情绪识别契约 v1

本文件约束情绪数据，不授予 AI 任何游戏权限。系统边界见 [ARCHITECTURE](ARCHITECTURE.md)，数值玩法仅以 [PRODUCT_SPEC](PRODUCT_SPEC.md) 为准。

## 1. 服务接口

规划接口：`POST /api/emotion`（Next.js App Router Route Handler）。请求 Content-Type 为 application/json：

```json
{"schemaVersion":1,"requestId":"req-example-01","entryId":"entry-example-01","inputRevision":0,"text":"今天终于完成作业，有一点累，但很开心。"}
```

schemaVersion 固定 1；requestId、entryId 为客户端创建的非空不透明 id（最多 100 字符），inputRevision 为非负整数。text 去首尾空白后 1–2000 个 Unicode 码点；空白、超长、错误类型直接 400，不调用模型。只传本条文本，不上传整个日记、库存、经验或角色存档。客户端改动草稿增加 inputRevision，并丢弃旧版本或非当前 requestId 的响应。

## 2. 模型唯一允许的输出

模型必须返回一个 JSON 对象，仅有下列字段；服务端解析 unknown，严格检查字段集合、枚举、有限数值与区间，拒绝未知字段，不把非法值静默变成中性。

```json
{"schemaVersion":1,"label":"joy","valence":0.82,"arousal":0.55,"dominance":0.70,"intensity":0.75,"confidence":0.86}
```

| 字段 | 类型 / 约束 | 含义 |
| --- | --- | --- |
| schemaVersion | 整数，固定 1 | 数据格式版本 |
| label | joy / calm / sadness / anxiety / anger / tired / mixed / neutral / unknown | 主情绪；矛盾并存用 mixed，信息不足用 unknown |
| valence | number，0–1 | 0 极消极，0.5 中性，1 极积极 |
| arousal | number，0–1 | 0 低激动，1 高激动；不是积极程度 |
| dominance | number，0–1 | 0 低控制感，1 高控制感；不是支配用户的权力 |
| intensity | number，0–1 | 情绪强度 |
| confidence | number，0–1 | 模型自报确定程度，不代表统计校准或医学结论 |

不接受字符串数字、NaN、Infinity、null、缺字段、数组、Markdown 代码围栏或 JSON 外说明。类别只用于描述，规则数值判断使用 VAD；不强行把 mixed 判为积极或消极。未来扩字段必须升版本并兼容消费端。

服务端对外返回匹配原请求的 envelope，id 与 revision 从请求复制，不能由模型生成：

```json
{"ok":true,"requestId":"req-example-01","entryId":"entry-example-01","inputRevision":0,"analysis":{"schemaVersion":1,"label":"joy","valence":0.82,"arousal":0.55,"dominance":0.70,"intensity":0.75,"confidence":0.86},"needsConfirmation":true}
```

所有识别结果都需用户点击保存。confidence < 0.6 或 label=unknown 时，额外提示先确认/手选；不能自动提交或发奖。合法的中性情绪仍可保存，与 API 失败不同。

## 3. 失败与降级

单次模型请求超时 15 秒，不自动重试。用户可主动重试识别或立即手选；识别重试不触发游戏规则。服务端只返回固定错误码与简短提示，不回传厂商原始错误、密钥或整段模型输出。

| 情况 | HTTP / code | 页面行为 |
| --- | --- | --- |
| 请求不合法 | 400 / INVALID_INPUT | 保留草稿，提示可修正 |
| 未配服务端 Key / 服务不可用 | 503 / AI_UNAVAILABLE | 展示手动选择 |
| 上游失败或限流 | 502 / AI_UPSTREAM_ERROR | 保留文本，手选或用户主动重试 |
| 超时 | 504 / AI_TIMEOUT | 同上 |
| 非 JSON / 缺字段 / 越界 / 未知操作字段 | 502 / AI_INVALID_OUTPUT | 不采用结果，展示手动选择 |

错误体示例：`{"ok":false,"requestId":"req-example-01","code":"AI_TIMEOUT","message":"识别暂时不可用，可手动选择情绪。"}`。缺少有效 requestId 的请求错误可省略该字段。网络断开或浏览器取消也进入同一手动流程，不默认保存 neutral。

## 4. 手动选择与用户纠正

内部统一 `EmotionReading` 使用上述 label、VAD、intensity；confidence 仅保留 AI 建议中。手动结果的 confidence 为 null，不能伪称模型 100% 确定。来源 source 为 ai / manual / corrected，由应用生成，不信任模型提供。

为便于无 API 演示，手选默认值如下，用户可以调节强度与 VAD（范围同上），不调用模型：

| 类别 | V | A | D | intensity |
| --- | --- | --- | --- | --- |
| joy | 0.85 | 0.70 | 0.70 | 0.70 |
| calm | 0.70 | 0.25 | 0.65 | 0.40 |
| sadness | 0.20 | 0.25 | 0.35 | 0.70 |
| anxiety | 0.25 | 0.80 | 0.25 | 0.70 |
| anger | 0.20 | 0.85 | 0.65 | 0.80 |
| tired | 0.40 | 0.15 | 0.35 | 0.50 |
| mixed | 0.50 | 0.50 | 0.50 | 0.60 |
| neutral | 0.50 | 0.50 | 0.50 | 0.30 |
| unknown | 0.50 | 0.50 | 0.50 | 0.30 |

保存前允许覆盖 AI 建议，保存 originalAnalysis、effectiveEmotion、source。保存后用同一 entryId 和递增 revision 记录纠正，保留原建议和修订轨迹；不发第二次经验、不追回已有成长。仅最新记录纠正影响当前视觉，具体处理见产品规格。对手选、导入数据也执行相同字段校验。

## 5. 强制权限边界

- 提示词只要求分析情绪，不提供工具调用、角色存档写入接口、物品目录操作或规则执行能力。
- 模型不得输出 action、animation、preset、xpDelta、unlock、hide、delete、stage、savePatch 等操作字段；出现任一未知字段整次结果无效。
- 规则引擎接收经校验、经用户确认的 EmotionReading，不能接收模型自由文本作为命令。
- 服务端 AI 模块不导入游戏写入模块；客户端不能导入服务端 provider。使用 server-only 边界隔离厂商适配器。
- API Key 用 `MODEL_API_KEY`；可选 `MODEL_BASE_URL`、`MODEL_NAME` 仅服务端使用，不加 NEXT_PUBLIC_，不进入响应、浏览器存储和日志。具体厂商不在指南中锁死。
- 默认仅记录错误码和耗时；不打印日记正文和模型原始内容。日记正文作为纯文本显示，不执行 HTML、脚本或模型指令。

## 6. 最小契约验收

情绪分支一次检查：正常对象能展示并确认；非法输出不改状态且能手选；修订后的草稿不被旧响应覆盖。真实 API 未配置时用明确标识 mock 走展示路径并记录限制，不以缺真实 API 阻止分支交付。关键规则结果在养成分支集中冒烟，不重复建设完整模型评测集。
