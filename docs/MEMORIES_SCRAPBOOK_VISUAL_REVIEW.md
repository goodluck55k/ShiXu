# 回忆手账第二轮视觉对照

状态：第二轮视觉已由用户确认（2026-11-16），桌面与手机视觉冻结。第三轮已在同一 PR #41 分支接入真实翻页；功能待用户最终验收，不标记为已完成。下文第二轮截图来自本地生产构建、Chrome 浏览器和隔离浏览器中通过正式日记表单保存的测试记录，不是产品种子数据。手机长截图的固定导航出现在截屏时的视口位置，实际滚动时固定在屏幕底部。

| 对照项 | 相比第一轮的改善 | 相比已确认概念图的剩余差异 |
| --- | --- | --- |
| 正文撕纸 | 独立的不规则纸片底层、暖纸色、微粒纹理、柔和阴影与横线；文字和操作位于纸片之上，长文可滚动。 | SVG 噪点与几何轮廓仍比实物纸纤维平滑；纸面没有概念图中水彩般的细节。 |
| 木边、书脊、叠页 | 多层暖木色边缘、页面阴影与渐变中缝强化厚度；书本宽度设上限。 | 边框仍由 CSS 构成，木纹和书页弯曲比手绘概念图规整。 |
| 企鹅阅读 | 保留正面母版，叠加绿色书、格纹靠垫、书堆和茶杯，不改变角色或行为。 | 企鹅仍是正面母版的直立轮廓，书是前景叠层；没有概念图中完整的坐姿、抱书翅膀与柔和手绘笔触。 |
| 左页拼贴和目录 | 便签改为不规则纸边和阴影，胶带半透明，加入纸夹、花朵和更有层次的纸签导航。 | 植物、四叶草、贴纸、纸夹和纸张交叠仍比概念图简洁；系统字体的手写感有限。 |
| 桌面比例 | 1440×900 截图中书本和翻页区均在首屏；1920 宽屏限制了书本最大宽度。 | 实际长文、编辑或展开纠正表单时页面可变高；与概念图的纸页比例并非像素级一致。 |
| 手机 | 保留正文优先单页、纸边、阅读装饰与可滚动的记录索引；390×844、375×667 无横向溢出，翻页区可滚至导航上方。 | 真实索引位于正文后，页面比概念图更长；手机仍使用简化 SVG 和系统字体。 |
| 翻页 | 第三轮已接入真实翻页：每页一条、最新为第 1 页，页码与进度来自真实记录；桌面两段式纸张轻翻、手机轻量过渡，低动态下直接切换。 | 视觉结构未改动；真实翻页的最终手感与跨浏览器表现仍待用户功能验收。 |

浏览器冒烟验证了日记选择、正文编辑、手动情绪纠正、刷新后重新选择记录、2754 字长文末尾及空态；两种手机视口下翻页区可滚动到固定导航上方。typecheck、lint、生产构建通过。未验证实体设备、非零安全区、其他浏览器及屏幕阅读器；截图不构成用户视觉验收。

## 第三轮：真实翻页验证（2026-11-16）

视觉验收状态：**第二轮桌面与手机视觉已由用户确认，视觉冻结**；本轮只做真实翻页、可访问性与必要功能状态的最小改动。功能状态：**已提交，待用户最终功能验收**，PR #41 保持 Draft、未合并。

- 分页：按 `createdAt` 倒序，每页一条真实日记，最新为第 1 页；桌面左页显示当前及相邻便签，右页显示全文；手机单页；页码、总页数与进度均由真实 `entries` 计算。9 条真实记录实测 `1 / 9` 至 `9 / 9`，新增第 9 条后由 `1 / 8` 更新为 `1 / 9`。
- 边界：首页禁用上一页、末页禁用下一页；0 条显示真实空态且不显示虚假页码；1 条显示 `1 / 1` 且两个方向均禁用。
- 动效：桌面两段式纸张轻翻（旧页离场、中点换页、新页进入）与书页光影；手机轻量位移淡入；动画期间锁定翻页入口，快速双击只前进一页；`prefers-reduced-motion: reduce` 下 40ms 内直接切换、无动画类。
- 兼容：2160 字长文在桌面可内部滚动至末尾，手机完整展开并可滚动阅读；正文保存失败提示保留；编辑有未保存修改时翻页与便签切换被阻止，并显示提示；情绪纠正往返后贡献条目数量不变、分值得以替换回原值。
- 手机：书本顶部与书本下方均有翻页入口；390×844、375×667、360×800 无横向溢出；390 与 375 下底部控件与固定导航间隔 48px；键盘 Enter 可触发翻页且焦点保留。
- 验证环境：本地生产构建（`npm run build` + `npm start`）、Chrome 157 无头浏览器、隔离用户目录；测试记录通过正式日记表单保存。typecheck、lint、build 通过。
- 未验证：实体设备、非零安全区、其他浏览器、屏幕阅读器、超大量记录的性能与虚拟化。

### 第三轮截图与录屏

- 桌面 1440×900：[第 1 页](assets/memories-codex-round3/desktop-1440-page1.png) · [第 2 页](assets/memories-codex-round3/desktop-1440-page2.png) · [第 9 页](assets/memories-codex-round3/desktop-1440-page9.png) · [长文](assets/memories-codex-round3/desktop-1440-longtext.png) · [长文末尾](assets/memories-codex-round3/desktop-1440-longtext-tail.png) · [草稿保护](assets/memories-codex-round3/desktop-1440-draft-guard.png) · [空态](assets/memories-codex-round3/desktop-1440-empty.png) · [单条](assets/memories-codex-round3/desktop-1440-single.png)
- 手机：[390×844 顶部](assets/memories-codex-round3/mobile-390-top.png) · [390×844 底部](assets/memories-codex-round3/mobile-390-bottom.png) · [390 长文](assets/memories-codex-round3/mobile-390-longtext.png) · [375×667](assets/memories-codex-round3/mobile-375-top.png) · [375 底部](assets/memories-codex-round3/mobile-375-bottom.png) · [360×800](assets/memories-codex-round3/mobile-360-top.png)
- 翻页录屏：[桌面 GIF](assets/memories-codex-round3/desktop-flip.gif) / [桌面 MP4](assets/memories-codex-round3/desktop-flip.mp4) · [手机 GIF](assets/memories-codex-round3/mobile-flip.gif) / [手机 MP4](assets/memories-codex-round3/mobile-flip.mp4)

## 第四轮：PR #41 三项 UI 专项整改（2026-11-16）

状态：三项整改已提交，**等待用户最终验收**；PR #41 保持 Draft、未合并。第三轮视觉结构未重新设计，只统一公共侧栏、修复正文下划线并替换翻页动画。以下截图与录屏均来自本地生产构建（`npm run build` + `npm start`）+ Chrome 157 无头浏览器；测试记录通过正式日记表单保存。

### 1. 三页统一公共侧栏

- 唯一实现：`src/components/AppSidebar.tsx`，由 `AppShell` 在三页统一挂载；`APP_NAV` 是唯一路由定义。
- 三页侧栏实测完全一致：`x=10, y=18, w=230, h=864`，padding `43px 16px 20px`，圆角 `24px`；三个导航按钮 rect 均为 `x=28, w=194, h=58`（y=185/254/323）。
- 本月心情小记 rect `[28,397,194,217]`、手账进度 rect `[28,630,194,118]`、底部装饰 rect `[28,766,194,88]` 三页一致。仅当前导航项的 active 状态不同；回忆页进度显示真实 `第 1 / 10 页 · 10%`，小屋与日记页显示真实总数与「到回忆碎片慢慢翻阅」引导，不伪造页码。
- 统计来自真实 `entries`：10 条记录、本月 9 类情绪（开心 2、安心 1、悲伤 1、焦虑 1、愤怒 1、疲惫 1、复杂 2、平常 1），新增测试记录后由 9 条更新为 10 条。
- 已移除 `.home-shell .sidebar`、`.memories-shell .sidebar` 独立外观与 `.scrap-sidebar-extra` 固定悬浮统计层；侧栏宽度通过 `--shell-sidebar-width` / `--shell-content-offset` 统一。
- 小屋场景仍铺满侧栏右侧可用区域，未改企鹅尺寸、行为、场景资源或镜头；移动端统一底部三入口，安全区保留。

桌面 1440×900：

- [企鹅小屋侧栏](assets/memories-codex-round4/desktop-home-sidebar.png)
- [心情日记侧栏](assets/memories-codex-round4/desktop-diary-sidebar.png)
- [回忆碎片侧栏](assets/memories-codex-round4/desktop-memories-sidebar.png)

手机：

- 390×844：[小屋](assets/memories-codex-round4/mobile-home-390.png) · [日记](assets/memories-codex-round4/mobile-diary-390.png) · [回忆](assets/memories-codex-round4/mobile-memories-390.png)
- 375×667：[小屋](assets/memories-codex-round4/mobile-home-375.png) · [日记](assets/memories-codex-round4/mobile-diary-375.png) · [回忆](assets/memories-codex-round4/mobile-memories-375.png)

### 2. 正文下划线跟随文字

- 删除 `.memory-full-text` 的 `repeating-linear-gradient` 背景横线，改为 `text-decoration-line: underline`、`text-decoration-color: #d9bda4`、`text-underline-position: under`、`text-underline-offset: .42em`、`text-decoration-skip-ink: none`。
- 计算样式实测：`textDecorationLine=underline`、`backgroundImage=none`、`line-height=35.2px`；2058 字长文在 100%/125%/150% 下分别形成 88/121/165 个真实行盒，下划线随行盒换行，页面 `overflowX=0`。
- 覆盖一行中文、多行中文、中英混排、长数字与标点、手动换行、空行与 2058 字长文；保留暖纸色、撕边、纸纹和长文滚动，正文原文未被修改、清洗或截断。

- [桌面长文 100%](assets/memories-codex-round4/desktop-1440-longtext.png)
- [正文近景（中英混排）](assets/memories-codex-round4/desktop-1440-longtext-closeup.png)
- [长文末尾（手动换行/长数字/标点）](assets/memories-codex-round4/desktop-1440-longtext-tail.png)
- 125% 缩放：[截图](assets/memories-codex-round4/desktop-1440-zoom125-longtext.png)
- 150% 缩放：[截图](assets/memories-codex-round4/desktop-1440-zoom150-longtext.png)
- 手机 390 长文：[截图](assets/memories-codex-round4/mobile-memories-390.png)

125% / 150% 使用 1440×900 物理窗口对应的 CSS 视口（1152×720 / 960×600）与 DPR 1.25 / 1.5 模拟浏览器缩放。

### 3. 真实 3D 翻书

- 动画层：`flip-stage` 提供 `perspective`；`flip-leaf` 以书脊为 `transform-origin`，`transform-style: preserve-3d`；正面/背面双面纸页使用 `backface-visibility: hidden`；加入动态投影、纸页厚度边与自由边卷曲高光。
- 下一页：纸页 0°→-180°，90° 时切换右页正文；上一页：-180°→0°（手机 -95°→0°），落页前切换正文，避免中途跳变；动画结束卸载纸页并恢复真实正文层。
- 未使用逐字 DOM、固定字数换行、原文插入换行或伪快照；动画期间正文层 `inert`，真实鼠标点击编辑按钮不会进入编辑态；草稿未保存时禁止翻页；低动态直接切换。
- 实测：快速连续点击 6 次只前进一页；`visibilitychange` 隐藏时提交目标页并清除纸页；键盘 Enter 可翻页，动画结束后焦点仍停留在翻页按钮；桌面/手机动画期间 `overflowX=0`。

录屏（真实浏览器帧，30fps，MP4）：

- 桌面完整（先下一页、后上一页）：[desktop-flip.mp4](assets/memories-codex-round4/desktop-flip.mp4)
- 手机完整（先下一页、后上一页）：[mobile-flip.mp4](assets/memories-codex-round4/mobile-flip.mp4)

关键帧：

- 桌面下一页：[0%](assets/memories-codex-round4/desktop-next-start.png) · [50%](assets/memories-codex-round4/desktop-next-mid.png) · [100%](assets/memories-codex-round4/desktop-next-end.png) · [纸页背面](assets/memories-codex-round4/desktop-next-back.png)
- 桌面上一页：[0%](assets/memories-codex-round4/desktop-prev-start.png) · [50%](assets/memories-codex-round4/desktop-prev-mid.png) · [100%](assets/memories-codex-round4/desktop-prev-end.png)
- 手机下一页：[0%](assets/memories-codex-round4/mobile-next-start.png) · [50%](assets/memories-codex-round4/mobile-next-mid.png) · [100%](assets/memories-codex-round4/mobile-next-end.png)
- 手机上一页：[0%](assets/memories-codex-round4/mobile-prev-start.png) · [50%](assets/memories-codex-round4/mobile-prev-mid.png) · [100%](assets/memories-codex-round4/mobile-prev-end.png)

### 4. 验证结果

- `npm run typecheck`、`npm run lint`、`npm run build` 通过。
- 三页侧栏几何一致；真实新增记录后月度统计与总页数更新（9 → 10）。
- 长文 2058 字：100%/125%/150% 与 390/375 手机宽度下下划线随文字换行，无横向溢出。
- 首末页禁用；快速连点只前进一页；草稿未保存阻止翻页并提示；保存失败草稿保留（沿用既有逻辑）。
- 低动态：`prefers-reduced-motion: reduce` 下 80ms 内直接切换、无 `.flip-stage`。
- 页面隐藏：翻到一半时触发 `visibilitychange`，提交目标页、纸页清除，无半翻状态。
- 键盘 Enter 可翻页，焦点保留；动画期间正文层 `inert=true`，真实鼠标点击编辑按钮不会进入编辑态。
- 未验证：实体设备、非零安全区、Safari/Firefox、屏幕阅读器、超大量记录性能。翻页手感与视觉仍需用户最终验收。
