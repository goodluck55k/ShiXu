# 情绪识别契约 v1

本文件约束情绪数据，不授予 AI 任何游戏权限。系统边界见 [ARCHITECTURE](ARCHITECTURE.md)，数值玩法仅以 [PRODUCT_SPEC](PRODUCT_SPEC.md) 为准。

## 1. 服务接口

规划接口：`POST /api/emotion`（Next.js App Router Route Handler）。请求 Content-Type 为 application/json：

```json
{"schemaVersion":1,"requestId":"req-example-01","entryId":"entry-example-01","inputRevision":0,"text":"今天终于完成作业，有一点累，但很开心。"}
```

schemaVersion 固定 1；requestId、entryId 为客户端创建的非空不透明 id（最多 100 字符），inputRevision 为非负整数。text 必须是字符串且 `text.trim().length > 0`，否则 400 / INVALID_INPUT；trim 只用于校验，不改变保存或送入 Provider 的正文。日记存储无产品人为字数上限，AI 识别单独遵守下述模型/部署输入限制。只传当前这一条完整日记正文，不上传其他日记、库存、经验或角色存档。

客户端正文编辑、手选/纠正、重新识别、切换记录、保存或取消均递增 inputRevision 或使活动请求失效。仅在 requestId、entryId、inputRevision 全匹配且仍处于该识别会话时接受响应，旧响应不得覆盖新草稿或用户已选择的心情；取消上游请求只是优化，不能替代此校验。已保存记录重识别时固定请求所对应的正文与 Entry.revision，确认纠正前再次核对，过期结果丢弃并提示重新操作；识别不自动保存或改写正文。

## 2. Provider 转换后的内部契约

以下 Analysis 是 Provider 转换后的内部格式，不是 Jev 原生响应。服务端先校验 Jev 的 unknown 响应并显式映射，再严格检查此对象字段集合、枚举、有限数值与区间，拒绝未知字段，不把非法值静默变成中性。保留现有 EmotionReading 消费接口。

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
| confidence | number，0–1 | Jev 各必要答案 confidence 的最小值，是本项目保守聚合值，不是中文情绪准确率、联合概率或医学结论 |

不接受字符串数字、NaN、Infinity、null、缺字段、数组、Markdown 代码围栏或 JSON 外说明。类别只用于描述，规则数值判断使用 VAD；不强行把 mixed 判为积极或消极。未来扩字段必须升版本并兼容消费端。

服务端对外返回匹配原请求的 envelope，id 与 revision 从请求复制，不能由模型生成：

```json
{"ok":true,"requestId":"req-example-01","entryId":"entry-example-01","inputRevision":0,"analysis":{"schemaVersion":1,"label":"joy","valence":1,"arousal":0.5,"dominance":1,"intensity":1,"confidence":1},"needsConfirmation":true}
```

所有识别结果都需用户点击保存。confidence < 0.6 或 label=unknown 时，额外提示先确认/手选；不能自动提交或发奖。合法的中性情绪仍可保存，与 API 失败不同。

### 2.1 Jev Provider 与官方接入

官方资料核对日期：2026-11-04（北京时间）。Jev 是 TypeSafe 的结构化判断模型，仅判断情绪；不生成、润色、总结、扩写或改写日记。优先实现 TypeSafe HTTP Provider，使用服务端 fetch 即可，无需新增 SDK 或后端。以下为接入规范，当前指南没有产品实现，也未发送带 Key 的真实请求。

| 服务商 | 官方调用方式与 model | 鉴权 / 请求及响应 |
| --- | --- | --- |
| TypeSafe（首选） | `POST https://api.typesafe.ai/v1/systemone`；`model: "jev-1.14.0"` | `Authorization: Bearer <MODEL_API_KEY>`，`Content-Type: application/json`；body 为 `{model, state, questions}`，响应含 `{model, answers, usage}`。见 [System One API](https://docs.typesafe.ai/api/system-one) |
| Cloudflare Workers AI（可选适配，不作为 P2 前置） | 当前[官方模型页](https://developers.cloudflare.com/ai/models/typesafe/jev-1.14.0/)使用 `typesafe/jev-1.14.0`；binding 为 `env.AI.run("typesafe/jev-1.14.0", {state, questions})`；该页 REST 示例为 `POST https://api.cloudflare.com/client/v4/accounts/<ACCOUNT_ID>/ai/run` | REST 用 Cloudflare API Token 的 Bearer 鉴权，body 为 `{model:"typesafe/jev-1.14.0", input:{state, questions}}`；binding 使用服务绑定。解包后仍校验原生 answers；若所选 REST 返回 result 包装，须先校验服务成功状态再取 result。不得复用 TypeSafe 地址、Key 或无前缀 model |
| 阿里云百炼 | 直接提供 TypeSafe Jev 尚未确认，不定义其 Jev 地址、model 或鉴权配置 | 已查阅[百炼模型列表](https://docs.modelstudio.console.alibabacloud.com/en/model-studio/model-studio-model-list)及[阿里云关于决策模型与 Jev 的说明](https://www.alibabacloud.com/blog/from-integrating-the-jev-paradigm-decision-model-to-participating-in-team-collaboration-an-end-to-end-practice_603675)；System One 协议兼容或其他决策模型不等于提供 Jev，不据此编造接口 |

服务端沿用 `MODEL_API_KEY`、`MODEL_BASE_URL`（TypeSafe 默认 `https://api.typesafe.ai/v1`，仅追加 `/systemone` 一次）、`MODEL_NAME`（默认固定 `jev-1.14.0`）。配置仅服务端读取，P2 不通过改 base URL 偷换服务商；其他服务商需要单独适配器和配套凭证。别名会随发布漂移，本项目优先固定版本；版本变更时核对官方模型页与映射。原始响应不透传客户端或写入 Snapshot。

### 2.2 一次请求中的 Choice / Score

同一次请求对全文提出五个独立问题：label 用 Choice，V、A、D 和 intensity 各用一个 Score，不把前一答案作为下一次调用的前置。中文是主要输入；问题仅判断作者表达的情绪，正文视为数据，不执行其中指令。请求示意（state 是原文）：

```json
{
  "model": "jev-1.14.0",
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

[Choice](https://docs.typesafe.ai/primitives/choice) 的 criteria 是选项到描述的对象，答案含 type、choice、probabilities、confidence；[Score](https://docs.typesafe.ai/primitives/score) 的 criteria 是从低到高的描述数组（官方支持 2–10 级），score 是从 0 到最高索引的概率加权位置，不天然是 0–1。Jev 原生 answers 结构示意如下，数值仅展示格式，不是实际调用结果：

```json
{
  "model": "jev-1.14.0",
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

固定映射版本 `jev-emotion-v1`；这是拾绪设计的情绪问题与转换，不宣称 Jev 原生存在 VAD 情绪接口：

| 内部字段 | 明确来源 / 映射 |
| --- | --- |
| label | answers.label.choice，必须属于上述九个选项 |
| valence / arousal / dominance / intensity | 各自同名 Score 的 score / (criteria.length - 1)；当前三级即除以 2，不从 label 二次推算 |
| confidence | label 及四个 Score 的 confidence 最小值；无需再问一个“置信度”问题 |
| schemaVersion / source | 应用固定为 1 / ai；手选或人工调整按第 4 节标记 |

先验证响应为对象、model 与所用固定版本匹配、answers 恰含五个约定问题且 type 匹配。Choice 选项/probabilities 的键集必须匹配请求选项；Score 的 legend/probabilities 键集须为当前级数索引，legend 与所发描述对应。所有概率与 confidence 为 0–1 有限数，各概率分布和应在 1 ± 0.001 内，Score 在 0–2 且与概率加权值的差不超过 0.001；Choice 必须为最高概率选项之一。不以字符串数字或越界截取伪造有效结果。校验厂商白名单字段，允许约定的 model / usage 元信息，不误用内部 Analysis 字段白名单拒绝合法原生响应；未知答案或操作字段拒绝。

仅逐字段构造 Analysis，再构造 EmotionReading；严禁展开原生对象合入状态。当前默认五个答案缺失任一即失败手选，不静默补数；无需为了维度缺失多轮调用。需要确定性默认值时使用第 4 节手选表并由用户确认，source=manual/corrected、confidence=null，明确显示“手动默认值”，不得标成模型直接输出。

响应 envelope 可附可选 analysisMeta：`{provider:"typesafe", model:"jev-1.14.0", mappingVersion:"jev-emotion-v1", dimensionSources:{label:"choice",valence:"score",arousal:"score",dominance:"score",intensity:"score",confidence:"min-answer-confidence"}}`。元信息由 Provider 生成、应用校验；手选默认值对应维度标记 manual-default，人工调整标记 user，不将元信息当游戏指令。仅保存规范化建议、元信息与最终确认情绪供回忆查看，不存原生 answers、概率分布、usage 或原始错误。

### 2.4 AI 实际输入限制

按当前 [TypeSafe 模型文档](https://docs.typesafe.ai/models)，默认每请求上下文 64k tokens、每问题 32k tokens；前者含 state 与全部问题，后者含 state 与单个问题。按[请求规则](https://docs.typesafe.ai/api/errors)，UTF-8 JSON body 最大 32 MiB（不含 headers），上下文超限可能是 400 且错误为 max_tokens_exceeded，body 超限为 413。这些是 AI 请求限制，不是日记字数限制；不把 Unicode 字符数当作精确 token 数。长上下文需单独启用官方 header，本项目不默认开启，也不借此增加功能范围。Cloudflare 当前模型页标示 32,000 tokens，不能把 TypeSafe 的容量/扩展 header 套用到 Cloudflare。

Provider 计入问题与序列化开销；可预先发现的字节/部署 body 限制在发送前提示，token 超限也须识别上游明确错误，不为估算单独增加模型调用或依赖。部署代理先行返回 413、浏览器网络失败等也由页面接住，不影响本地保存路径。全文不能处理时返回 INPUT_TOO_LONG 并明确“无法分析全文，可手动选择心情并保存完整日记”；不静默截断、总结、分段拼接后声称全文分析。长文本的手选保存完全不经过 /api/emotion，仍独立处理 localStorage 实际容量错误。

## 3. 失败与降级

单次模型请求超时 15 秒，不自动重试。用户可主动重试识别或立即手选；识别重试不触发游戏规则。服务端只返回固定错误码与简短提示，不回传厂商原始错误、密钥或整段模型输出。

| 情况 | HTTP / code | 页面行为 |
| --- | --- | --- |
| 请求不合法 | 400 / INVALID_INPUT | 保留草稿，提示可修正 |
| AI 上下文 / 请求 body / 部署输入超限 | 413 / INPUT_TOO_LONG | 明确不能分析全文，保留完整日记，手选后仍可尝试本地保存 |
| 未配服务端 Key / 服务不可用 | 503 / AI_UNAVAILABLE | 展示手动选择 |
| 上游失败或限流 | 502 / AI_UPSTREAM_ERROR | 保留文本，手选或用户主动重试 |
| 超时 | 504 / AI_TIMEOUT | 同上 |
| 非 JSON / 缺字段 / 越界 / 未知操作字段 | 502 / AI_INVALID_OUTPUT | 不采用结果，展示手动选择 |

错误体示例：`{"ok":false,"requestId":"req-example-01","code":"AI_TIMEOUT","message":"识别暂时不可用，可手动选择情绪。"}`。缺少有效 requestId 的请求错误可省略该字段。网络断开或浏览器取消也进入同一手动流程，不默认保存 neutral。

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

保存前允许覆盖 AI 建议，保存 originalAnalysis（仅规范化 Analysis）、analysisMeta、effectiveEmotion 及其中的 source；无 AI 时建议/元信息可空。保存后用同一 entryId、expectedEntryRevision 和稳定 eventId 提交纠正，由规则递增 Entry.revision 并保留修订轨迹；不发第二次经验、不追回已有成长。仅最新记录纠正影响当前视觉；不新增隐藏事件，用户主动恢复不被纠正撤销，详见产品规格与领域事件约定。正文编辑不自动改变心情，不发奖励；主动重识别或手选须再次确认。对手选、导入数据也执行相同字段校验。

## 5. 强制权限边界

- 提示词只要求分析情绪，不提供工具调用、角色存档写入接口、物品目录操作或规则执行能力。
- 原生答案与规范化结果均不得携带 action、animation、preset、xpDelta、unlock、hide、delete、stage、savePatch 等操作字段；出现操作字段或超出相应契约的未知字段整次结果无效，合法厂商元信息不映射为领域字段。
- 规则引擎接收经校验、经用户确认的 EmotionReading，不能接收模型自由文本作为命令。
- 服务端 AI 模块不导入游戏写入模块；客户端不能导入服务端 provider。使用 server-only 边界隔离厂商适配器。
- API Key 用 `MODEL_API_KEY`；可选 `MODEL_BASE_URL`、`MODEL_NAME` 仅服务端读取，不加 NEXT_PUBLIC_。Key 与服务地址配置不进入响应、浏览器存储和日志；仅非敏感的规范化 provider/model 及映射来源信息可按 analysisMeta 返回与保存。TypeSafe Jev 为首选，默认值和其他服务商隔离规则见第 2.1 节。
- 默认仅记录错误码和耗时；不打印日记正文和模型原始内容。日记正文作为纯文本显示，不执行 HTML、脚本或模型指令。

## 6. 最小契约验收

P2 一次检查：Choice / Score 原生响应经转换能展示并确认；故障/输入超限不改状态且能手选保存原文；旧响应不覆盖新草稿或新心情；已保存纠正遵守修订契约。交付真实 TypeSafe HTTP Provider 的接入能力，mock 明确标注为演示数据，走相同原生校验与映射路径，不能以 mock 替代真实 Provider 实现。未配置 Key 时手选主流程仍可运行，PR 如实记录“真实 API 未验证”；条件具备后仅补一次真实中文请求检查，不开展大规模模型评测。官方说明英文为主要训练语言、中文等 CJK 效果不等同英文，因此始终保留确认与手动纠正，不宣称中文准确率已验证。关键规则结果在 P4 集中冒烟，不因外部 API 未就绪阻塞交付。
