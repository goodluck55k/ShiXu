# 参考仓库与源码阅读记录

阅读日期：2026-11-04（北京时间；阶段七参考补充于 2026-11-13）。本文件记录实际查看的 GitHub 源码、角色/场景参考与取舍；引用用于定位学习，当前指南没有复制第三方产品代码或美术素材。分支 main 会变化，后续若复用代码需重新核实目标版本和许可。

## 1. Pet Mochi

仓库：<https://github.com/cskwork/pet-mochi>。阅读时仓库 main 显示提交 `29e67cfeebeaeb05d07c9b568bb0008c3482fc4e`。

| 已阅读文件 | 源码观察 | 拾绪借鉴与边界 |
| --- | --- | --- |
| [state.ts](https://github.com/cskwork/pet-mochi/blob/main/src/lib/sim/state.ts) | Mood、Intent、MovementState 使用有限联合类型，持久化状态与运行环境分离 | 借鉴有限状态与显式 context；不继承 hunger/energy 衰减体系 |
| [tick.ts](https://github.com/cskwork/pet-mochi/blob/main/src/lib/sim/tick.ts) | runTick 组合衰减、情绪和动作选择，返回新状态；对过长时间间隔设上限 | 借鉴纯函数状态推进；拾绪直接取消离线衰减，不只是缩短惩罚时间 |
| [choreography.ts](https://github.com/cskwork/pet-mochi/blob/main/src/lib/sim/choreography.ts) | 有限动作目录、带时长的步骤序列、事件/情绪驱动的确定性 fallback | 借鉴本地动作序列；原项目允许 LLM 选 preset 和 variant，拾绪明确禁止，全部由规则决定 |
| [events/bus.ts](https://github.com/cskwork/pet-mochi/blob/main/src/lib/events/bus.ts) | 订阅/分发、有限最近事件缓存，避免某些事件被重复记录 | 借鉴明确事件与单一写入责任；当前 reducer 足够，不额外建设总线框架 |
| [keepsakes.ts](https://github.com/cskwork/pet-mochi/blob/main/src/lib/sim/keepsakes.ts) | 礼物资格与生成分离，按 pet/day 稳定选择纪念品，调用方负责 IO 与计时 | 借鉴纪念品幂等和回忆关联；不复制照顾达标压力与原项目数值 |
| [LICENSE](https://github.com/cskwork/pet-mochi/blob/main/LICENSE) | MIT；Copyright (c) 2026 cskwork | 若未来复制实质代码，保留版权和完整 MIT 许可，不将第三方素材许可想当然扩展 |

不照搬：Tauri 桌面外壳、Svelte、Rust 后端、SQLite/FTS5、本地文件监视、桌面通知、模型动作选择、饥饿或长时间不登录处罚。MVP 只采用 Web 所需的确定性模拟思路。

## 2. NeoPet Virtual Pet Web App

仓库：<https://github.com/EgoisticCoder/NeoPet-Virtual-Pet-Web-App>。阅读时 main 显示提交 `86f6837de9e4597e2f8230d3f280da7f9b0d7e1f`。

| 已阅读文件 | 源码观察 | 拾绪借鉴与边界 |
| --- | --- | --- |
| [src/lib/llm.ts](https://github.com/EgoisticCoder/NeoPet-Virtual-Pet-Web-App/blob/main/src/lib/llm.ts) | analyzeSentiment 请求类别和 0–1 VAD，JSON.parse 后直接返回，异常回落 neutral | 借鉴类别/VAD 分离；拾绪增加严格结构与范围校验、置信度、用户确认和手选，失败不伪装为 neutral |
| [src/lib/dna.ts](https://github.com/EgoisticCoder/NeoPet-Virtual-Pet-Web-App/blob/main/src/lib/dna.ts) | 将 VAD 转为色相、振动、粒子和光晕，数值有边界 | 借鉴情绪维度到视觉参数的规则映射；保留白色本体，不复制持续色相变化或负面削减永久成果 |
| [package.json](https://github.com/EgoisticCoder/NeoPet-Virtual-Pet-Web-App/blob/main/package.json) | private=true；无 license 字段，依赖含 better-sqlite3，未见 Firebase 依赖 | 不把 README 中 Firebase 技术描述直接当作当前源码事实；不继承其数据库/认证方案 |
| [README](https://github.com/EgoisticCoder/NeoPet-Virtual-Pet-Web-App) 与根目录文件列表 | 描述聊天与养成，但根目录未见 LICENSE/COPYING，README 未给出明确复用许可 | 许可未确认；公开可读不等于允许复制，当前仅学习思路并自行实现 |

许可结论仅针对本次检查到的根目录、README 与 package.json，不声称排除了所有潜在授权来源。未来若计划复制任何代码/素材，必须先取得明确适用的许可证或作者授权；在此之前不得直接复制、改名搬运或把它作为可二开的基底。

不照搬：AI 任意游戏写入能力、完整聊天/语音/任务商城、ASCII 角色、美术和旧经验值经济体系（拾绪 V1 已废止经验值、等级与成长阶段机制）。拾绪不沿用未经校验的 JSON.parse 和失败自动 neutral 逻辑。

## 3. React Nice Avatar

仓库：<https://github.com/dapi-labs/react-nice-avatar>。阅读时 main 显示提交 `03536105038e5022ab5302f1b8b6cc9b846c8dcc`。

| 已阅读文件 | 源码观察 | 拾绪借鉴与边界 |
| --- | --- | --- |
| [src/index.tsx](https://github.com/dapi-labs/react-nice-avatar/blob/main/src/index.tsx) | Face/Hat/Hair/Eye/Glasses/Mouth/Shirt 等组件由配置组合，帽子与头发有条件显示 | 借鉴独立图层与配置组合，重做全身角色、锚点与层级，不直接使用半身头像成品 |
| [src/types.ts](https://github.com/dapi-labs/react-nice-avatar/blob/main/src/types.ts) | 五官、衣服与配饰样式有有限类型和 AvatarConfig | 借鉴有类型的稳定配置，不将 AI 输出当作组件代码 |
| [src/eyes/index.tsx](https://github.com/dapi-labs/react-nice-avatar/blob/main/src/eyes/index.tsx) | 根据有限 style 选择 Circle/Oval/Smile 子组件，提供默认值 | 借鉴局部图层白名单与回落 |
| [src/utils.ts](https://github.com/dapi-labs/react-nice-avatar/blob/main/src/utils.ts) | 支持种子配置和补齐缺省值；非种子分支也使用随机选择 | 拾绪用固定初始配置与显式确定性规则，禁止每次渲染随机重抽外观 |
| [LICENSE](https://github.com/dapi-labs/react-nice-avatar/blob/main/LICENSE) | MIT；Copyright (c) 2021 Chill Lab | 若未来复制实质代码，保留版权和完整 MIT 许可 |

README 另提到 Figma 的 Avatar Illustration System 与设计作者 Micah；代码仓库 MIT 不自动证明外部 Figma 文件、商标或其他素材都适用同一授权。拾绪本次不复用这些素材；阶段七最终角色为自行开发的原创黑白企鹅，当前白色小人是历史占位。

## 4. React Kawaii（阶段七表情系统结构参考）

阅读日期：2026-11-13。仓库：<https://github.com/elizabetdev/react-kawaii>。GitHub 元数据显示许可为 MIT；本次只检查仓库结构与文件列表，未复制代码。

| 观察 | 拾绪借鉴与边界 |
| --- | --- |
| `packages/react-kawaii/src/components` 下每个角色为独立组件（如 `Cat.tsx`、`Ghost.tsx`、`Planet.tsx`），`common/Face.tsx` 与 `common/paths.ts` 提供共享面部/路径 | 借鉴身体与面部分离、共享面部部件、按角色组合；拾绪自行设计企鹅身体与五官，不复制其角色造型 |
| `common/Face.tsx` 把面部拆成 mouth、eyes、blush 等独立分组，按 `mood` 组合；角色只传入 `mood` 等有限属性 | 借鉴眼睛/嘴巴独立控制与状态组合；拾绪明确**不加腮红**，不复用其 blush 层或角色造型 |
| 组件库提供可复用 React 组件 | 只作结构参考，不把 React Kawaii 作为运行时依赖；若未来复制实质代码，保留 MIT 版权与许可文本 |

## 5. LINEpenguin 企鹅表情作品（视觉语言参考）

链接：<https://www.behance.net/gallery/155133579/LINEpenguin>。阅读日期：2026-11-13。

| 观察 | 拾绪借鉴与边界 |
| --- | --- |
| 用简洁的形状与身体姿态传达明确情绪，表情生动但装饰克制 | 借鉴表情清晰度、姿态与情绪一致性、幼态可爱但不过度装饰 |
| 属于第三方作者作品，未见可复用许可说明 | 仅作视觉学习；不得复制具体角色形象、构图或受版权保护的美术素材 |

## 6. Penguin-Pet（阶段七自主活动与状态切换参考）

阅读日期：2026-11-13。仓库：<https://github.com/Myrrow/Penguin-Pet>。仓库根目录含 MIT 许可文本（Copyright (c) 2026 ZFHR）；GitHub 元数据许可为 `NOASSERTION`，复用前仍需重新核实。本次只检查仓库结构与文件列表，未复制代码。

| 已观察文件/目录 | 观察 | 拾绪借鉴与边界 |
| --- | --- | --- |
| `main.js`、`preload.js`、`package.json` | Electron 桌面宠物应用，含主进程与渲染进程 | 不引入 Electron、桌面常驻、系统级窗口或完整宠物框架；拾绪仍是 Web 应用 |
| `renderer/renderer.js`、`gait.js`、`affine.js` | 渲染层包含步态/运动与状态相关逻辑，角色可在桌面活动 | 借鉴待机、走路、转身、休息与动作状态切换；行为选择仍由拾绪现有确定性行为引擎决定 |
| `renderer/speech.js`、`assets/sprites` | 具备互动表现与精灵图资源 | 不复制其美术素材或台词；拾绪自行设计企鹅 SVG/组件与文案 |
| `LICENSE` | 含 MIT 许可文本；元数据未自动识别 | 若未来复用实质代码，重新核实许可并保留版权与许可文本；当前仅学习思路 |

## 7. Kinder World（生活空间与 UI 氛围参考）

链接：<https://www.playkinderworld.com/game>。阅读日期：2026-11-13。

| 观察 | 拾绪借鉴与边界 |
| --- | --- |
| 温暖舒适的场景氛围、柔和自然光、少量植物与生活元素、清晰空间层次，角色在场景中有自然存在感 | 借鉴生活空间尺度、治愈系美术语言与角色存在感；企鹅应有相对独立且足够大的生活空间 |
| 商业游戏，含自身玩法、货币与收集系统 | 仅作视觉与交互参考；不复制场景、角色、UI 素材或代码；不引入其玩法、货币、家具或收集系统 |

## 8. 采用原则

上述参考不是技术依赖清单，不必安装它们才能开发；阶段七的角色、表情、动作与场景参考还须遵守 [STAGE7_DESIGN](STAGE7_DESIGN.md) 的已确认/参考/未定分类。先遵循本项目 [AGENTS](../AGENTS.md)、[ARCHITECTURE](ARCHITECTURE.md)、[PRODUCT_SPEC](PRODUCT_SPEC.md)、[COMPANION_SPEC](COMPANION_SPEC.md) 和 [AI_CONTRACT](AI_CONTRACT.md)。后续真实复用代码时记录来源路径、固定提交、修改说明及适用许可；许可不明则自行实现，不让研究或授权等待阻塞已有可行方案。
