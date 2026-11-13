# 情绪识别契约 v1

本文件约束情绪数据，不授予 AI 任何游戏权限。系统边界见 [ARCHITECTURE](ARCHITECTURE.md)；玩法概述以 [PRODUCT_SPEC](PRODUCT_SPEC.md) 为准，详细养成规则与数值唯一来源是 [COMPANION_SPEC](COMPANION_SPEC.md)。

## 1. 服务接口

规划接口：`POST /api/emotion`（Next.js App Router Route Handler）。请求 Content-Type 为 application/json：

```json
{"schemaVersion":1,"requestId":"req-example-01","entryId":"entry-example-01","inputRevision":0,"text":"今天终于完成作业，有一点累，但很开心。"}
```

schemaVersion 固定 1；requestId、entryId 为客户端创建的非空不透明 id（最多 100 字符），inputRevision 为非负整数。text 必须是字符串且 `text.trim().length > 0`，否则 400 / INVALID_INPUT；trim 只用于校验，不改变保存或送入 Provider 的正文。日记存储无产品人为字数上限，AI 识别单独遵守下述模型/部署输入限制。只传当前这一条完整日记正文，不上传其他日记、性格记录或角色存档。

客户端正文编辑、手选/纠正、重新识别、切换记录、保存或取消均递增 inputRevision 或使活动请求失效。成功的识别结果只在 requestId、entryId、inputRevision 全匹配且仍处于该识别会话时采纳；失败响应必须核对当前活动请求，关联字段与当前会话冲突时丢弃：旧的成功响应不得覆盖新草稿或用户已选择的心情，过期的失败响应不得关闭新请求、覆盖新建议或清除用户已手选的状态；取消上游请求只是优化，不能替代此校验。已保存记录重识别时固定请求所对应的正文与 Entry.revision，确认纠正前再次核对，过期结果丢弃并提示重新操作；识别不自动保存或改写正文。阶段六将上述会话、三元组与严格字段校验集中到客户端 `src/lib/ai/client.ts`：成功 envelope 必须完整回显三元组且 HTTP 状态为 2xx，非 2xx 的 `ok:true` 一律按状态映射为固定错误；失败响应中只要带出的关联字段与当前会话冲突就丢弃，而请求体超限等解析前失败可以完全不带回显，此时当前仍有效的会话按固定错误码提示（如 413 / `INPUT_TOO_LONG`），不静默忽略。非 envelope 响应只按 HTTP 状态映射固定错误码。浏览器侧另设 20 秒超时，超时中止请求并提示 `AI_TIMEOUT`，不自动重发。

## 2. Provider 转换后的内部契约

以下 Analysis 是 Provider 转换后的内部格式，不是厂商原生响应。服务端先校验厂商未知响应并显式映射，再严格检查此对象字段集合、枚举、有限数值与区间，拒绝未知字段，不把非法值静默变成中性。保留现有 EmotionReading 消费接口。

```json
{"schemaVersion":1,"label":"joy","valence":1,"arousal":0.5,"dominance":1,"intensity":1,"confidence":1}
```

| 字段 | 类型 / 约束 | 含义 |
| --- | --- | --- |
| schemaVersion | 整数，固定 1 | 数据格式版本 |
| label | joy / calm / sadness / anxiety / anger / tired / mixed / neutral / unknown | 主情绪；矛盾并存用 mixed，信息不足用 unknown |
| valence | number，0–1 | 0 极消极，0.5 中性，1 极积极 |
| arousal | number，0–1 | 0 低激动，1 高激动；不是积极程度 |
| dominance | number，0–1 | 0 低控制感，1 高控制感；不是支配用户的权力 |
| intensity | number，0–1 | 情绪强度 |
| confidence | number，0–1 | Provider 各必要答案 confidence 的最小值，是本项目保守聚合值，不是中文情绪准确率、联合概率或医学结论 |

不接受字符串数字、NaN、Infinity、null、缺字段、数组、Markdown 代码围栏或 JSON 外说明。字段分工（契约 v1 现行规则，替代旧版「所有规则只按 VAD 判断」）：用户确认后的 label 主要用于隐藏性格基础评分与即时情绪反馈变体选择；VAD / intensity 用于即时情绪反馈、表情、动作强弱和部分环境表现；confidence 仅用于识别结果提醒和确认，不直接作为性格奖励倍数。不强行把 mixed 判为积极或消极。性格评分表与参数唯一来源见 COMPANION_SPEC，模型不得直接输出性格分数，也不参与主导判定、行为选择、离线生活生成或久别重逢。未来扩字段必须升版本并兼容消费端。

服务端对外返回匹配原请求的 envelope，requestId、entryId、inputRevision 从请求复制，不能由模型生成；有效请求的成功与失败响应都回传这三元组（失败体见第 3 节）：

```json
{"ok":true,"requestId":"req-example-01","entryId":"entry-example-01","inputRevision":0,"analysis":{"schemaVersion":1,"label":"joy","valence":1,"arousal":0.5,"dominance":1,"intensity":1,"confidence":1},"needsConfirmation":true}
```

所有识别结果都需用户点击保存。confidence < 0.6（暂定提醒阈值，不代表中文准确率）或 label=unknown 时，额外提示先确认/手选；不能自动提交或发奖。合法的中性情绪仍可保存，与 API 失败不同。

### 2.1 Provider 与接入顺序

核对日期：2026-11-10（北京时间）。情绪识别正式接入目标为**阿里云百炼（Model Studio）决策模型**，候选模型标识 `decision-model-preview`，优先使用与 System One 兼容的决策接口。百炼只判断情绪，不生成、润色、总结、扩写或改写日记。现有主线（PR #10）已实现真实 Provider 适配器；截至核实日尚未发送带 Key 的真实请求。

**百炼核实记录（2026-11-10，依据官方文档；账号真实调用未验证）**：

- 模型标识：`decision-model-preview` 已在百炼上线（2026-09-24，预览版，限时免费），协议为 TypeSafe System One：`POST {base}/compatible-mode/v1/systemone`，请求 `{model, state, questions}`，一次前向返回类型化 answers（choice / score / noul）、概率分布与 confidence，不生成文本。本契约五问（1 choice + 4 score）在协议限制内。
- Endpoint：必须使用业务空间专属域名，北京 `https://{WorkspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/systemone`，新加坡 `https://{WorkspaceId}.ap-southeast-1.maas.aliyuncs.com/compatible-mode/v1/systemone`；公共 dashscope 域名无该路由。
- 鉴权：`Authorization: Bearer <API Key>`，Key 按地域隔离；Workspace ID 必需（嵌入域名），本服务经 `BAILIAN_WORKSPACE_ID` 配置，默认北京地域，`MODEL_BASE_URL` 可覆盖。
- 限制：输入上限 65,536 tokens（超长 state 被拒绝）；单请求问题数 ≤16；choice 选项 ≤255；score 2–255 级；平台侧限流 RPM 1,200 / TPM 2,000,000。错误码沿用百炼通用错误码（InvalidApiKey、Arrearage、Throttling 等）。
- 账号是否开通与真实调用：未验证（开发环境无 Key）。具备 Key 与 Workspace 后按第 6 节做小样本检查；在此之前手选闭环可用，mock 明确标识为演示数据。
- 来源：help.aliyun.com/zh/model-studio/decision-model-preview、decision-model-api、error-code、rate-limit。

**阶段六复核（2026-11-13，仍为依据官方文档的代码复核）**：重新核对决策模型文档、API、限流与 CLI 页面，模型标识 `decision-model-preview`、业务空间专属 Endpoint、TypeSafe System One `{model, state, questions}`、五问 Choice/Score、概率与 confidence 语义均与上述记录一致；Provider 已按此实现并校验 model、五个答案、选项/legend/概率/分数。开发环境仍无 `MODEL_API_KEY` 与 `BAILIAN_WORKSPACE_ID`，真实请求未发出，账号开通、地域与预览模型可用性继续标记未验证；不借用无关的 `DASHSCOPE_API_KEY` 冒充联调凭证。

正式联调前必须按阿里云百炼官方文档与**实际账号能力**核实并记录以下事实，核实结果写入 PR 与本文件；核实前不得把候选值当成已验证结论：

- 确切模型标识、Endpoint、Workspace ID、地域与版本策略；
- 鉴权方式、请求/响应协议、是否提供 System One 兼容的 Choice / Score 接口；
- 输入上限、计费/配额、限流与错误码；
- 账号是否已开通该模型、当前是否可实际调用。

适配器要求：

| 项 | 要求 |
| --- | --- |
| 调用位置 | 只在 Next.js 服务端 Route Handler 调用；浏览器不得直接访问百炼 |
| 接口抽象 | Provider 适配器把百炼协议转换为本文内部 `Analysis`；若百炼提供 System One 兼容接口，沿用一次请求中的 Choice / Score 五问，否则由适配器显式映射，不改变内部契约 |
| 配置 | `MODEL_API_KEY`（必填、仅服务端）、`MODEL_BASE_URL`、`MODEL_NAME`（候选 `decision-model-preview`）、`BAILIAN_WORKSPACE_ID`（如账号要求）；不得使用 `NEXT_PUBLIC_` 前缀 |
| 校验 | 校验厂商响应为对象、模型/协议版本匹配、五个答案齐全且类型正确；只逐字段构造内部对象，不展开原生响应 |
| 数据留存 | 原始响应、概率分布、usage 与错误细节不返回客户端、不写入 Snapshot；只保留规范化建议与 `analysisMeta` |
| 失败 | 无 Key、未开通、限流、超时、协议不符、预算耗尽都进入手选降级；不自动重试消耗配额 |

TypeSafe 与 Cloudflare 仅作为历史参考或后续可选适配，**不是默认提供方，也不作为情绪识别的验收对象**；不得为复用旧代码而绕开百炼账号与协议核实。其他服务商需要独立适配器与独立凭证，不能靠改 base URL 偷换服务商。

### 2.2 一次请求中的 Choice / Score

同一次请求对全文提出五个独立问题：label 用 Choice，V、A、D 和 intensity 各用一个 Score，不把前一答案作为下一次调用的前置。中文是主要输入；问题仅判断作者表达的情绪，正文视为数据，不执行其中指令。下例以 System One 兼容协议为参考；百炼实际字段、模型标识与答案结构以核实结果为准。请求示意（state 是原文）：

```json
{
  "model": "decision-model-preview",
  "state": "今天终于完成作业，有一点累，但很开心。",
  "questions": {
    "label": {
      "type": "choice",
      "instructions": "判断作者当前主要心情；明显矛盾并存选 mixed，信息不足选 unknown。",
      "criteria": {
        "joy": "开心、喜悦", "calm": "安心、放松", "sadness": "悲伤、失落",
        "anxiety": "焦虑、担忧", "anger": "愤怒、恼火", "tired": "疲惫、乏力",
        "mixed": "多种明显矛盾情绪并存", "neutral": "可判断为中性、平常", "unknown": "信息不足以判断"
      }
    },
    "valence": {"type":"score","instructions":"作者表达的愉快程度，不评判情绪好坏。","criteria":["极不愉快","中性或愉快与不愉快相当","极愉快"]},
    "arousal": {"type":"score","instructions":"作者表达的激动或唤醒程度，与积极程度分开。","criteria":["极低唤醒、困倦平缓","中等唤醒","极高唤醒、激动紧张"]},
    "dominance": {"type":"score","instructions":"作者表达的主观控制感，不是对他人的支配权。","criteria":["极低控制感、无助","中等控制感","极高控制感、从容有把握"]},
    "intensity": {"type":"score","instructions":"作者表达的情绪强度，与激动程度分开。","criteria":["情绪很淡或几乎没有","中等强度","情绪极强烈"]}
  }
}
```

[Choice](https://docs.typesafe.ai/primitives/choice) 的 criteria 是选项到描述的对象，答案含 type、choice、probabilities、confidence；[Score](https://docs.typesafe.ai/primitives/score) 的 criteria 是从低到高的描述数组（官方支持 2–10 级），score 是从 0 到最高索引的概率加权位置，不天然是 0–1。上述 Primitive 语义作为参考；若百炼接口不同，Provider 仍须显式映射到同一内部契约。Provider 原生 answers 结构示意如下，数值仅展示格式，不是实际调用结果：

```json
{
  "model": "decision-model-preview",
  "answers": {
    "label": {"type":"choice","choice":"joy","confidence":1,"probabilities":{"joy":1,"calm":0,"sadness":0,"anxiety":0,"anger":0,"tired":0,"mixed":0,"neutral":0,"unknown":0}},
    "valence": {"type":"score","score":2,"confidence":1,"legend":{"0":"极不愉快","1":"中性或愉快与不愉快相当","2":"极愉快"},"probabilities":{"0":0,"1":0,"2":1}},
    "arousal": {"type":"score","score":1,"confidence":1,"legend":{"0":"极低唤醒、困倦平缓","1":"中等唤醒","2":"极高唤醒、激动紧张"},"probabilities":{"0":0,"1":1,"2":0}},
    "dominance": {"type":"score","score":2,"confidence":1,"legend":{"0":"极低控制感、无助","1":"中等控制感","2":"极高控制感、从容有把握"},"probabilities":{"0":0,"1":0,"2":1}},
    "intensity": {"type":"score","score":2,"confidence":1,"legend":{"0":"情绪很淡或几乎没有","1":"中等强度","2":"情绪极强烈"},"probabilities":{"0":0,"1":0,"2":1}}
  },
  "usage": {"input_tokens":500,"output_tokens":100}
}
```

### 2.3 服务端校验和维度映射

固定映射版本 `bailian-emotion-v1`；这是拾绪设计的情绪问题与转换，不宣称百炼原生存在 VAD 情绪接口：

| 内部字段 | 明确来源 / 映射 |
| --- | --- |
| label | answers.label.choice，必须属于上述九个选项 |
| valence / arousal / dominance / intensity | 各自同名 Score 的 score / (criteria.length - 1)；当前三级即除以 2，不从 label 二次推算 |
| confidence | label 及四个 Score 的 confidence 最小值；无需再问一个“置信度”问题 |
| schemaVersion / source | 应用固定为 1 / ai；手选或人工调整按第 4 节标记 |

先验证响应为对象、model 与所用固定版本匹配、answers 恰含五个约定问题且 type 匹配。Choice 选项/probabilities 的键集必须匹配请求选项；Score 的 legend/probabilities 键集须为当前级数索引，legend 与所发描述对应。所有概率与 confidence 为 0–1 有限数，各概率分布和应在 1 ± 0.001 内，Score 在 0–2 且与概率加权值的差不超过 0.001；Choice 必须为最高概率选项之一。不以字符串数字或越界截取伪造有效结果。校验厂商白名单字段，允许约定的 model / usage 元信息，不误用内部 Analysis 字段白名单拒绝合法原生响应；未知答案或操作字段拒绝。

仅逐字段构造 Analysis，再构造 EmotionReading；严禁展开原生对象合入状态。当前默认五个答案缺失任一即失败手选，不静默补数；无需为了维度缺失多轮调用。需要确定性默认值时使用第 4 节手选表并由用户确认，source=manual/corrected、confidence=null，明确显示“手动默认值”，不得标成模型直接输出。

响应 envelope 可附可选 analysisMeta：`{provider:"bailian", model:"decision-model-preview", mappingVersion:"bailian-emotion-v1", dimensionSources:{label:"choice",valence:"score",arousal:"score",dominance:"score",intensity:"score",confidence:"min-answer-confidence"}}`（model 以核实结果为准）。元信息由 Provider 生成、应用校验；手选默认值对应维度标记 manual-default，人工调整标记 user，不将元信息当游戏指令。仅保存规范化建议、元信息与最终确认情绪供回忆查看，不存原生 answers、概率分布、usage 或原始错误。

### 2.4 AI 实际输入限制

输入上限以阿里云百炼官方文档与所选模型/接口为准。核实结果（2026-11-10）：`decision-model-preview` 输入上限 65,536 tokens，超长 state 被拒绝。部署层仍按保守上限保护：每请求上下文不超过 64k tokens、UTF-8 JSON body 不超过 32 MiB，超限直接返回 413 / INPUT_TOO_LONG，不出网；发送前另按可配置字符数预检（默认 30,000 字符，`AI_MAX_INPUT_CHARS`），并识别上游明确的输入超限错误。这些是 AI 请求限制，不是日记字数限制；不把 Unicode 字符数当作精确 token 数。长上下文能力、计费与配额以核实结果为准，不默认开启未确认的扩展能力，也不借此增加功能范围。

Provider 计入问题与序列化开销；可预先发现的字节/部署 body 限制在发送前提示，token 超限也须识别上游明确错误，不为估算单独增加模型调用或依赖。部署代理先行返回 413、浏览器网络失败等也由页面接住，不影响本地保存路径。全文不能处理时返回 INPUT_TOO_LONG 并明确“无法分析全文，可手动选择心情并保存完整日记”；不静默截断、总结、分段拼接后声称全文分析。长文本的手选保存完全不经过 /api/emotion，仍独立处理 localStorage 实际容量错误。

### 2.5 公开部署的成本保护

`/api/emotion` 是消耗服务端 Key 配额的公开接口。公开部署前必须具备以下保护，在阶段六的契约与最小验收中落实；本指南只定义要求，不实现限流代码，不引入登录、复杂用户系统或数据库：

- 服务端请求体字节上限：调用 Provider 前按 UTF-8 字节数校验请求体，超限直接返回 413 / INPUT_TOO_LONG，不出网。该上限独立于日记产品字数限制，手选保存完整原文不经过此接口。
- 部署层请求频率限制与并发上限：对请求频率和同时在途的识别请求数设上限，超限返回 429 / AI_RATE_LIMITED。阈值与实现方式由所选部署环境决定；未确定平台时只约定行为与错误码，不写死某一平台能力或限流方案，不虚构平台特性。
- 可配置的调用预算保护：提供服务端可配置的调用预算，预算耗尽时停止后续 Provider 调用并返回 503 / AI_UNAVAILABLE，提示手动选择；预算状态等敏感细节不透传客户端。
- 上述任一保护触发时，客户端均按第 3 节进入手动心情选择，仍可保存完整原文；保护仅针对 AI 分析请求，不限制日记正文长度。
- 识别失败一律不自动重试消耗配额（沿用第 3 节单次请求、用户主动重试）；频率、并发与预算保护不得诱发客户端自动重发。

这些保护在公开部署前必须有效；本地或未公开演示可暂缓，但 PR 须如实记录部署保护是否已生效。

阶段六实现状态（2026-11-13）：`/api/emotion` 已实现请求体字节上限、正文与模型输入预检、每分钟请求数、并发与调用预算保护，阈值见 `.env.example`；超限分别返回 413 / 429 / 503，并保留完整正文供手选保存。计数为**单进程内存状态**，仅在单实例内有效；多实例或无状态公开部署必须由部署平台叠加同等限流与配额保护，不能把本实现当作已满足公开部署要求。真实 API 未验证，预算与错误码行为由本地上游桩和路由测试覆盖。

## 3. 失败与降级

单次模型请求超时 15 秒（覆盖获取响应头与读取响应体），不自动重试；浏览器请求另设 20 秒上限，超时提示 `AI_TIMEOUT` 并同样不自动重发。用户可主动重试识别或立即手选；识别重试不触发游戏规则。服务端只返回固定错误码与简短提示，不回传厂商原始错误、密钥或整段模型输出。

| 情况 | HTTP / code | 页面行为 |
| --- | --- | --- |
| 请求不合法 | 400 / INVALID_INPUT | 保留草稿，提示可修正 |
| AI 上下文 / 请求 body / 部署输入超限 | 413 / INPUT_TOO_LONG | 明确不能分析全文，保留完整日记，手选后仍可尝试本地保存 |
| 未配服务端 Key / 服务不可用 / 调用预算耗尽 | 503 / AI_UNAVAILABLE | 展示手动选择 |
| 上游失败或上游限流 | 502 / AI_UPSTREAM_ERROR | 保留文本，手选或用户主动重试 |
| 本服务部署层频率 / 并发保护超限 | 429 / AI_RATE_LIMITED | 保留文本，手选或用户主动重试；不自动重发 |
| 超时 | 504 / AI_TIMEOUT | 同上 |
| 非 JSON / 缺字段 / 越界 / 未知操作字段 | 502 / AI_INVALID_OUTPUT | 不采用结果，展示手动选择 |

对有效请求，错误体与成功 envelope 一样回传 requestId、entryId、inputRevision（从请求复制，不由模型生成），例如：`{"ok":false,"requestId":"req-example-01","entryId":"entry-example-01","inputRevision":0,"code":"AI_TIMEOUT","message":"识别暂时不可用，可手动选择情绪。"}`。无法解析或校验关联字段的非法请求，可省略无效字段（如缺少有效 requestId 时省略该字段）；请求体字节超限发生在解析前，可以不携带任何三元组。客户端处理成功与失败响应都必须核对当前活动请求与会话状态：成功响应要求三元组全匹配且 HTTP 状态为 2xx；失败的关联字段与当前会话冲突时丢弃；不带冲突字段的当前请求失败（含 413 请求体超限）仍按固定错误码提示。过期错误不得关闭新请求、覆盖新建议或清除用户已手选的状态。浏览器网络断开或取消也按当前会话有效性处理，进入同一手动流程，不默认保存 neutral。

## 4. 手动选择与用户纠正

内部统一 `EmotionReading` 使用上述 label、VAD、intensity；首次直接接受 AI 建议时 source=ai，confidence 保留其聚合值；首次纯手选为 manual，人工修改建议或保存后纠正为 corrected。manual / corrected 的 confidence 为 null，原 AI confidence 留在建议中，不能伪称模型 100% 确定。source 由应用生成，不信任模型提供；保存后接受重识别建议仍属于纠正，不恢复首次结算资格。

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

保存前允许覆盖 AI 建议，保存 originalAnalysis（仅规范化 Analysis）、analysisMeta、effectiveEmotion 及其中的 source；无 AI 时建议/元信息可空。保存后用同一 entryId、expectedEntryRevision 和稳定 eventId 提交纠正，由规则递增 Entry.revision 并保留修订轨迹；不重复结算、不追回已有成长。性格贡献按 COMPANION_SPEC 第 2.6 节替换修订：同 entryId 只有一份有效贡献，不叠加计分，跨日期纠正沿用原冻结 dayKey，原子保存；迁移后无新贡献的旧条目纠正只更新情绪与历史，不补建贡献、不改分数。仅最新记录纠正影响当前视觉；饰品装扮属 V2 范围，由未来饰品模块按只读性格状态与已确认领域事件独立结算，V1 不实现，边界见 COMPANION_SPEC 第 7 节。正文编辑不自动改变心情、不改变性格贡献、不触发结算；主动重识别或手选须再次确认。对手选、导入数据也执行相同字段校验。

## 5. 强制权限边界

- 提示词只要求分析情绪，不提供工具调用、角色存档写入接口、物品目录操作或规则执行能力。
- 原生答案与规范化结果均不得携带 action、animation、preset、xpDelta、personalityScore、personalityDelta、habit、behavior、behaviorId、dominantId、lowMoodStreak、offlineEvent、reunionTriggered、stage、scenePatch、savePatch、decorationId、decorationUnlock、decorationReclaim 等操作字段；出现操作字段或超出相应契约的未知字段整次结果无效，合法厂商元信息不映射为领域字段。
- 规则引擎接收经校验、经用户确认的 EmotionReading，不能接收模型自由文本作为命令。
- AI 负责产生情绪分析建议；用户确认后 EmotionReading 进入本地规则系统。隐藏性格评分由确定性规则产生，不由模型直接输出性格分数；手动选择和 AI 建议确认使用同一套人格成长规则。主导判定、行为选择、离线生活生成与久别重逢同样只由本地确定性规则决定，AI 不得参与。AI 不得获得动作执行、物品发放、场景修改或存档写入能力；不额外引入 AI Agent、长期聊天模型或复杂决策框架。
- 服务端 AI 模块不导入游戏写入模块；客户端不能导入服务端 provider。使用 server-only 边界隔离厂商适配器。
- API Key 用 `MODEL_API_KEY`；可选 `MODEL_BASE_URL`、`MODEL_NAME`、`BAILIAN_WORKSPACE_ID` 仅服务端读取，不加 NEXT_PUBLIC_。Key 与服务地址配置不进入响应、浏览器存储和日志；仅非敏感的规范化 provider/model 及映射来源信息可按 analysisMeta 返回与保存。百炼为默认提供方，TypeSafe/Cloudflare 仅作历史参考或后续可选适配，隔离规则见第 2.1 节。
- AI 只输出情绪建议。隐藏性格评分、成长结算与自主行为均由本地确定性规则决定；V2 饰品一旦实现，其解锁、回收、再获得与穿戴资格同样只由本地确定性规则决定；模型不得输出可直接执行的成长或饰品指令，也不得因为一次识别结果直接改变正式状态。
- 默认仅记录错误码和耗时；不打印日记正文和模型原始内容。日记正文作为纯文本显示，不执行 HTML、脚本或模型指令。

## 6. 最小契约验收

阶段六一次检查：百炼 Choice / Score（或 Provider 映射后的等价结构）经转换能展示并确认；故障/输入超限不改状态且能手选保存原文；旧响应不覆盖新草稿或新心情；已保存纠正遵守修订契约；公开部署的成本保护（第 2.5 节）按所选环境生效或如实记录暂缓；同时确认 AI 不参与主导判定、行为选择、离线生活生成与久别重逢。交付真实阿里云百炼 Provider 的接入能力，mock 明确标注为演示数据，走相同原生校验与映射路径，不能以 mock 替代真实 Provider 实现。未配置 Key、账号未开通或真实调用条件不具备时，手选主流程仍可运行，PR 如实记录“真实 API 未验证”，不阻塞手选主流程（既有主线已交付）。真正具备 API 调用条件后，用约 8–12 条带人工预期标签的简短中文样例（覆盖积极、消极、混合、中性与含糊表达）做一次小样本检查，核对类别映射、confidence < 0.6 阈值提醒与手选降级是否合理；不开展大规模模型评测，也不在缺少证据时擅自改动 0.6 暂定阈值。confidence 是各答案分布集中度的保守聚合，不代表中文识别准确率；始终保留确认与手动纠正，不宣称中文准确率已验证。性格计分与行为判定等关键规则结果在对应阶段集中冒烟，不因外部 API 未就绪阻塞交付。

阶段六完成记录（2026-11-13）：三元组匹配、新旧成功/失败响应隔离、严格 analysis/analysisMeta 校验、`needsConfirmation`、低置信度与 `unknown` 提醒、采纳/修改来源区分、保存后重识别绑定正文与修订号、纠正替换均已由 `tests/stage6-client.ts` 与浏览器主流程冒烟覆盖；服务端 Provider 映射、非法原生响应、400/413/429/502/503/504、预算与并发、15 秒体读取超时、日志脱敏由 `tests/stage6-server.ts` 覆盖。`AI_PROVIDER_MODE=mock` 只用于测试/演示且页面明确标注“演示数据”；默认真实 Provider。8–12 条真实中文样例未执行，原因如实记录为缺少 `MODEL_API_KEY` 与 `BAILIAN_WORKSPACE_ID`。
