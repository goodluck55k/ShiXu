# 拾绪 ShiXu · 许愿屋真实功能验收报告（第三轮）

> 日期：2026-11-17。基线 SHA：`fd702d3f39955fd74ef1f35ad70f2645261273b1`。分支：`feature/wish-house`；PR：[#43](https://github.com/goodluck55k/ShiXu/pull/43)，保持 Draft。
> 第二轮已确认的桌面与手机视觉基线不变；本轮只增加真实功能、操作控件、保存/错误状态与完成动画。**等待用户最终功能验收，未合并。**
> 本文中的截图与录屏均由本机真实 Chrome 运行实际页面生成；开发截图中左下角圆形 `N` 是 Next.js 开发指示器，不属于产品 UI。

## 1. 交付范围

- 新增独立愿望领域模块：创建、手动完成、状态校验、集合校验、重复完成幂等。
- 新增独立、可版本化的本地存储适配器；不修改 `Snapshot` v4、日记、情绪、五维性格、主导、离线生活、久别重逢或现有迁移链。
- 新增愿望应用层：加载、创建、完成、保存失败保护、跨标签页冲突、损坏/未来版本恢复、一次性完成动画信号、开发样例内存隔离。
- 接入真实纸团与星星：每个可见对象对应真实愿望 ID；完成持久化成功后才播放纸团升起变星星。
- 新增完成按钮、完成时间、进行中状态、错误/恢复提示、成功反馈与自动淡出。
- 新增愿望专项测试脚本；未引入测试框架、数据库、状态框架或新的运行时依赖。

未修改：`AppProvider`、`Snapshot` v4、既有三页布局、四页导航结构、企鹅 SVG 母版、玻璃杯与纸团美术、场景与手机导航。

## 2. 数据模型与存储版本

```ts
type WishStatus = "pending" | "completed";

interface Wish {
  id: string;
  text: string;                 // 原始文本，按纯文本渲染
  status: WishStatus;
  createdAt: number;
  completedAt: number | null;   // pending 必须为 null
}

interface WishCollection {
  schemaVersion: 1;             // 当前唯一受支持版本
  revision: number;             // 非负整数；每次成功写入 +1
  wishes: Wish[];
}
```

- 存储键：`shixu.wishes.v1`，与 `shixu.snapshot.v1` 完全独立。
- 格式版本：值内 `schemaVersion = 1`；未来版本读取为 `unsupported-version`，不会被当作空集合覆盖。
- 修订策略：保存前读取现有集合并校验 `revision`；只有匹配 `expectedRevision` 才写入 `expectedRevision + 1`。
- 校验：ID 非空且唯一、文本非空白、状态合法、时间戳有限、`completedAt` 与状态一致；不设置产品字数上限，不裁剪原文。
- 愿望不关联九类情绪、VAD、五维性格、企鹅行为或离线生活；不调用 AI，不上传愿望。

## 3. 创建与完成流程

**创建**：输入非空白 → 生成唯一 ID 与 `createdAt` → 构造候选集合 → 存储写入 → 只有返回 `saved` 才更新列表、清空已保存输入并显示「愿望已经放进许愿杯里啦」。失败保留输入与旧列表。

**完成**：确认愿望仍为 `pending` → 构造 `completedAt` → 存储写入 → 成功后更新集合、移除对应纸团、显示星星并发出一次性 `{ wishId, nonce }` 动画信号。重复完成、未知 ID 均为无副作用 no-op；原始文本与 `createdAt` 不变。

**失败**：额度不足、存储不可用、写入异常、冲突、损坏或未来版本都不会提前更新正式 UI；完成失败不播放成功动画。损坏/未来版本保留原始 `raw`，提供导出与显式确认后的重置。

## 4. 写入失败与恢复保护

| 情况 | 行为 |
| --- | --- |
| 浏览器存储不可用 | 读取为 `unavailable`；禁止保存并保留输入；提示检查隐私设置后重试 |
| 额度不足 | `quota-exceeded`；不写入、不改列表、不播放动画；保留草稿并显示可理解原因 |
| 写入异常 | `unavailable`；同上 |
| 现有数据损坏 | 读取为 `corrupt`，返回原始 `raw`；不自动覆盖；提供导出、重新加载与显式确认重置 |
| 未来存储版本 | 读取为 `unsupported-version`，保留原始 `raw`；不静默重置或覆盖 |
| 候选集合非法 | `invalid`；不写入 |
| 修订冲突 | `conflict`；本页暂停保存，提示重新加载 |
| 重置 | 只允许覆盖用户在界面上确认过的那份原始 `raw`；数据已在其他位置变化时返回冲突，不盲写 |

显式重置使用 `window.confirm` 二次确认；成功后写入 `{ schemaVersion: 1, revision: 0, wishes: [] }`，失败保留原始内容。

## 5. 跨标签页处理边界

- 监听 `storage` 事件；愿望键被其他标签页修改时立即暂停本页创建/完成，显示「愿望已在其他标签页更新」与「重新加载愿望」。
- 保存时比较修订号；过期修订返回 `conflict`，旧状态不会覆盖新状态。
- 浏览器支持 Web Locks 时，使用 `shixu.wishes.lock` 将“读取→比较修订→写入”串行化；不支持时退回修订号检查 + `storage` 事件。
- **边界**：Web Locks 不可用的浏览器里，读取后比较再写入仍不是绝对原子事务；同时提交仍有极小竞争窗口，应用会通过后续修订冲突与 `storage` 事件停止继续写入，但不宣称完整多标签页事务保证。
- 已用两个真实标签页验证：A 创建后 B 出现冲突提示、暂停保存；B 重新加载后看到 A 的新愿望。

## 6. 纸团、星星与愿望 ID 的对应

- `WishJar` 接收真实 `pending` / `completed` 视图集合，不再接收数量。
- 可见顺序：待完成按 `createdAt`、已完成按 `completedAt` 升序；同一时间按 ID 稳定排序。
- 槽位：愿望 ID 的 FNV-1a 哈希选择首选槽位，冲突时确定性向后探测；颜色、尺寸、倾角与星光延迟同样由 ID 推导，刷新不会随机重排。
- 每个纸团带 `data-wish-id`、`data-wish-kind="ball"`；每颗星星带 `data-wish-id`、`data-wish-kind="star"`，便于真实浏览器核验对应关系。
- 视觉上限沿用已确认的纸团 8、星星 5；超出时仅限制杯内绘制，愿望板与页签计数仍展示真实总数，不合并、不伪造、不溢出。
- 超出可见纸团上限的愿望完成时，从杯口升起临时星光，不借用其他愿望的纸团；超出星星上限时临时星光淡出，不抢占已有星星槽位。

## 7. 完成动画与低动态

- 动画只在存储返回 `saved` 后由一次性 `{ wishId, nonce }` 信号触发；动画组件不写存储、不再次执行完成。
- 真实纸团从杯内原位升起、缩小并淡出，暖金色星星在上升过程中出现并落位到目标槽位；总时长 1.6s。
- 动画结束由 `animationend` 处理，另有 2s 兜底定时器；动画覆盖层不进入持久化，刷新后已完成愿望直接静态显示。
- 低动态：`prefers-reduced-motion: reduce` 时不渲染升起覆盖层，直接静态切换纸团→星星；星光脉冲动画也为 `none`。
- 动画层 `pointer-events:none`，不阻挡面板或输入；位于玻璃杯 SVG 内，手机端不产生横向溢出。

## 8. 开发样例隔离

- 样例仅在 `NODE_ENV === "development"` 且 `?preview=sample` 时启用；带「开发预览示例 · 非真实愿望数据，不会写入存档」标识。
- 样例创建/完成只在内存集合中运行，不调用愿望存储适配器；切换回正式 `/wishes` 时按模式重新挂载，不会把预览状态带入正式存储。
- 生产构建中 `?preview=sample` 被忽略，显示真实空状态；已在生产服务器上创建、完成并刷新真实愿望验证。

## 9. 验证结果

### 工程检查

- `npm run typecheck`：通过。
- `npm run lint`：通过。
- `npm run build`：通过（Next.js 16.4.5，`/wishes` 静态预渲染）。
- `npm run test:wishes`：17 项通过（领域创建/完成/幂等/校验、存储修订/冲突/损坏/未来版本/额度/不可用/重置、槽位上限/唯一性/稳定性）。

### 真实 Chrome 验收

集中执行 50 项检查，全部通过，覆盖：

1. 空存储真实空状态；创建 1 条/多条；刷新恢复。
2. 真实纸团与愿望 ID 一一对应；完成后纸团移除、星星落位。
3. 动画仅在保存成功后出现；刷新后直接静态显示，不重播。
4. 1920×1080、1440×900、390/375/360px 无横向溢出。
5. 手机真实完成动画帧录制（171 帧）。
6. 低动态模式无升起层、静态星星、星光动画 `none`。
7. 额度不足保存失败保留草稿、不产生愿望；完成失败不出现星星、保持待完成。
8. 损坏 JSON / 未来版本保留原文、提供导出/重置；显式重置后恢复空集合。
9. 两标签页冲突提示、暂停保存、重新加载后看到新愿望。
10. 12 条待完成 / 7 条已完成时杯内仅 8 纸团与 5 星，页签与面板显示 12/7；长列表可滚动。
11. `<script>` 与长文本按纯文本显示，不执行脚本，不撑破布局。
12. 开发样例不写真实存储；退出预览后正式状态仍为空。
13. 生产构建 `?preview=sample` 不注入样例；生产环境真实创建/完成/刷新通过。
14. 愿望创建/完成前后 `shixu.snapshot.v1` 逐字不变且仍为 `schemaVersion` 4。
15. 四页导航、日记页、回忆页加载冒烟；无未捕获异常。

最终生产构建（含“重新加载后清除愿望板旧错误”的收尾改动）另执行 7 项冒烟：创建/完成、快照不变、刷新恢复、跨标签页冲突与重新加载、低动态静态切换；全部通过。

### 结论

- 未发现 P0 / P1 或影响演示主流程的问题。
- 未发现需要单独登记 Issue 的无关 P2。

## 10. 截图与录屏

| 材料 | 链接 |
| --- | --- |
| 桌面 1920×1080（3 待完成 / 1 已完成） | [desktop-1920x1080.jpg](assets/wish-house-functional-review/desktop-1920x1080.jpg) |
| 桌面 1440×900 创建成功 | [desktop-created.jpg](assets/wish-house-functional-review/desktop-created.jpg) |
| 桌面 1440×900 完成状态 | [desktop-completed.jpg](assets/wish-house-functional-review/desktop-completed.jpg) |
| 桌面动画录屏（真实 Chrome 逐帧，GIF） | [desktop-animation.gif](assets/wish-house-functional-review/desktop-animation.gif) |
| 动画开始帧（点击前纸团在杯内） | [animation-start.jpg](assets/wish-house-functional-review/animation-start.jpg) |
| 动画中间帧（纸团升起） | [animation-mid.jpg](assets/wish-house-functional-review/animation-mid.jpg) |
| 动画完成帧（星星落位） | [animation-end.jpg](assets/wish-house-functional-review/animation-end.jpg) |
| 手机 390×844 | [mobile-390x844.jpg](assets/wish-house-functional-review/mobile-390x844.jpg) |
| 手机 390 宽完整页面（含输入与底栏） | [mobile-390-full.jpg](assets/wish-house-functional-review/mobile-390-full.jpg) |
| 手机 375×667 | [mobile-375x667.jpg](assets/wish-house-functional-review/mobile-375x667.jpg) |
| 手机 360×780 | [mobile-360x780.jpg](assets/wish-house-functional-review/mobile-360x780.jpg) |
| 手机动画录屏（真实 Chrome 逐帧，GIF） | [mobile-animation.gif](assets/wish-house-functional-review/mobile-animation.gif) |
| 低动态模式完成结果 | [reduced-motion-completed.jpg](assets/wish-house-functional-review/reduced-motion-completed.jpg) |
| 保存失败保留草稿 | [save-failure-draft-preserved.jpg](assets/wish-house-functional-review/save-failure-draft-preserved.jpg) |
| 完成写入失败不出现星星 | [completion-failure-no-star.jpg](assets/wish-house-functional-review/completion-failure-no-star.jpg) |
| 损坏数据恢复入口 | [storage-corrupt.jpg](assets/wish-house-functional-review/storage-corrupt.jpg) |
| 未来版本保护 | [storage-unsupported.jpg](assets/wish-house-functional-review/storage-unsupported.jpg) |
| 跨标签页冲突 | [cross-tab-conflict.jpg](assets/wish-house-functional-review/cross-tab-conflict.jpg) |
| 超过 8/5 视觉上限（桌面） | [over-capacity-desktop.jpg](assets/wish-house-functional-review/over-capacity-desktop.jpg) |
| 超过 8/5 视觉上限（手机） | [over-capacity-mobile.jpg](assets/wish-house-functional-review/over-capacity-mobile.jpg) |
| 开发样例隔离 | [dev-sample.jpg](assets/wish-house-functional-review/dev-sample.jpg) |
| 生产构建忽略 `?preview=sample` | [production-sample-ignored.jpg](assets/wish-house-functional-review/production-sample-ignored.jpg) |

## 11. 未解决与风险

- **跨标签页边界**：支持 Web Locks 的浏览器内写入串行化；不支持时仍依赖修订检查与 `storage` 事件，不是绝对原子事务。已在报告与代码注释中明确，不宣称强事务。
- **动画期间再创建愿望**：动画的起始槽位由当前集合重建；若用户在 1.6s 动画内立刻创建新愿望，极少见情况下起始位置可能重新计算。数据与持久化不受影响，不阻塞验收。
- **无产品字数上限**：极长愿望可能触发本地存储额度不足；系统明确提示并保留草稿，不静默截断。
- **视觉上限参数**：纸团 8、星星 5 与 1.6s 动画时长沿用已确认视觉方案/候选参数，后续如调整需单独视觉验收。
- **无障碍**：完成按钮具备明确 `aria-label`、键盘可达与忙碌状态；完成提示为 `aria-live` 区域；未进行独立屏幕阅读器专项审计。
- **完成提示**：愿望板内的一次性完成提示对超长愿望截断到 24 字，仅影响提示文案，不截断真实愿望数据。
- 未进行跨设备长期使用、真实移动浏览器（iOS/Android）与多用户并发压测；这些属于阶段八范围。

## 12. 提交与状态

- 基线：`fd702d3f39955fd74ef1f35ad70f2645261273b1`。
- 分支：`feature/wish-house`；原 PR #43。
- 本轮最终提交 SHA、推送结果与 PR 描述更新见 PR #43 顶部；**PR 保持 Draft，未合并，未启用自动合并**。
- 不进入阶段八，不修改已合并的 PR #38、#41、#42。