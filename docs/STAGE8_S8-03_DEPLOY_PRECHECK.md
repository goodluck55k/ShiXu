# 任务卡：阶段八 S8-03 部署兼容性预检

> 状态（2026-11-18）：**预检完成，Windows RSC 404 已修复；S8-03E 复核确认 Qoder Sites 没有 rewrite/redirect、目录索引或无扩展名映射，`/diary` 等干净 URL 无法由应用产物修复；已采用 `.html` 规范链接作为平台真实支持的最小可用方案（见第 10、11 节）；未重新发布**。本分支只做 Qoder Sites 兼容性探针与最小构建适配；未创建公网站点、未创建付费云资源、未调用真实模型。
>
> 分支：`feature/stage8-deploy`（基于 `origin/main` `9c2d3da`）；PR 指向 `main`，保持 Draft，是否合并由用户决定。

## 1. 结论

- Qoder Sites 的托管模型是**静态产物 + 可选单个 Edge Function**，不运行 Next.js Node 服务、`next start` 或任意常驻进程。
- 当前仓库可通过 `output: "export"` 导出 `/`、`/diary`、`/memories`、`/wishes` 四页；`/api/emotion` 是 Node Route Handler，**不能随静态导出发布**。
- 无真实 Key 时手选保存闭环在静态产物中可用；AI 按钮会进入固定错误提示并保留草稿。
- Windows 构建的 RSC 分段 404 已通过构建后路径归一化修复；本地四页导航与全部 RSC 分段请求均为 200。
- 推荐先发布**不含 AI 的静态站点**；真实百炼联调受 S8-02 凭证阻挡，AI Edge Function 移植另行评估。

## 2. 平台约束（2026-11-18 核实）

| 项目 | 约束 |
| --- | --- |
| 构建 | `prepare_site` 不执行应用构建；必须先在本地生成静态目录并传入 `webDirectory` |
| 静态路由 | ESA Pages 文档：`/file` 响应 `file.html`；`/file.html` 307 到 `/file`；目录索引行为与 Qoder Sites Skills 的“目录索引禁用”提示不完全一致，因此不使用 trailingSlash |
| 服务端 | 仅支持 `/functions/v1/app` 单个 Edge Function（Deno，入口 `index.ts`），不支持 Next.js Route Handler |
| 保留路径 | `/api`、`/functions`、`/internal`、`/storage` 等为平台命名空间，前端不应把应用 API 放在 `/api` |
| 环境变量 | Function 通过 `Deno.env.get` 读取应用 Secret；静态产物无运行时服务端环境变量 |
| 体积 | 当前 `out/` 为 1.5 MiB、52 个文件，远低于 50 MiB 产物限制 |

## 3. S8-03C Windows 静态导出 RSC 404（2026-11-18）

### 3.1 根因

Next.js 16 静态导出在 Windows 上把 RSC 分段文件写成了嵌套目录：

- 导出器用 `path.relative()` 得到含反斜杠的路径（如 `diary\__PAGE__.segment.rsc`）。
- `convertSegmentPathToStaticExportFilename()` 只把 `/` 替换为 `.`，反斜杠保留。
- 写入时 `path.join()` 把反斜杠当目录分隔符，得到 `out/diary/__next.diary/__PAGE__.txt`。
- 客户端实际请求 `/diary/__next.diary.__PAGE__.txt?_rsc=...`，因此 404；根页面 `/__next.__PAGE__.txt` 不含反斜杠，所以未受影响。

上游问题：[vercel/next.js#85374](https://github.com/vercel/next.js/issues/85374)、[vercel/next.js#92339](https://github.com/vercel/next.js/issues/92339)。#92339 明确期望 `__next.foo/bar/__PAGE__.txt` 归一化为 `__next.foo.bar.__PAGE__.txt`。

### 3.2 修复方式

`scripts/build-static.mjs` 在 `next build` 成功后扫描 `out/`：将以 `__next.` 开头的目录内所有 `.txt` 按层级用 `.` 连接后上移到父目录，再删除嵌套目录；遇到非 `.txt` 文件或目标重名直接失败，避免静默产出错误路径。未升级 Next.js、未改写路由、未修改 `node_modules`。

同一脚本在产物中移除 `character-preview` 的 `html`/`txt`/目录：该页在 `AppFrame` 中仅 development 生效，文档也标注为仅开发预览。

### 3.3 验证结果

- 构建日志：`[build-static] normalized 6 RSC segment file(s)`；`out/` 中不再存在 `__next.*` 目录。
- 物理文件与请求一致：如 `out/diary/__next.diary.__PAGE__.txt` 对应 `/diary/__next.diary.__PAGE__.txt?_rsc=...`。
- 浏览器页面上下文按客户端规则请求 22 个 RSC/分段 URL：全部 200，`content-type` 为 `text/plain; charset=utf-8`。
- 浏览器客户端导航 `/` → `/diary` → `/memories` → `/wishes` → `/`：全部渲染正确，控制台无错误，相关 `*_rsc` 请求均 200。
- `npm run build` 常规构建仍通过，`/api/emotion` 仍为动态 Route Handler。

## 4. 最小代码改动

| 文件 | 改动 | 原因 |
| --- | --- | --- |
| `next.config.ts` | `NEXT_STATIC_EXPORT=1` 时启用 `output: "export"` 与 `pageExtensions: ["tsx", "jsx", "js"]` | 保留本地/自托管 `next build`；导出构建排除 `route.ts`，避免 `force-dynamic` 报错 |
| `src/app/character-preview/page.tsx` | 移除 `export const dynamic = "force-dynamic"` | 该页仅开发预览；静态导出不接受 force-dynamic |
| `scripts/build-static.mjs` | 新增静态导出入口；构建后归一化 Windows RSC 分段路径；移除 `character-preview` 产物 | 修复 RSC 预取 404；开发预览页不进入正式发布产物 |
| `package.json` | 新增 `build:export` | 一条命令生成可发布的 `out/` |

未修改五维评分、主导判定、行为权重、企鹅视觉、正式 UI、`Snapshot` v4 或愿望存储。

## 5. 已执行验证

| 验证 | 命令/方式 | 结果 |
| --- | --- | --- |
| 静态导出 | `npm run build:export` | 通过；路由表仅含四页与 `/companion`，无 `/api/emotion`；RSC 分段归一化 6 个文件 |
| 常规构建 | `npm run build` | 通过；`/api/emotion` 仍为动态 Route Handler，供本地/自托管使用 |
| 类型检查 | `npx tsc --noEmit` | 通过 |
| AI 契约回归 | `stage6-server.ts`、`stage6-client.ts` | 通过（前次执行；本次仅改构建脚本与文档，未重复执行） |
| 产物检查 | `out/` | 1.5 MiB、52 文件；四页、`/companion`、`404.html` 存在；无 `__next.*` 目录；无 `character-preview` |
| 本地 clean URL 探针 | 本地静态服务 | `/`、`/diary`、`/diary/`、`/memories`、`/wishes` 200；`/character-preview`、`/api/emotion` 404 |
| RSC 请求 | 浏览器页面上下文按客户端 URL 规则请求 | 22 个页面/分段 URL 全部 200；`/diary/__next.diary.__PAGE__.txt` 等不再 404 |
| 浏览器四页 | 本地静态服务 | 四页直接访问、刷新与客户端导航均正常，控制台无错误 |
| 手选保存 | `/diary` 输入正文 → 选择「安心」→ 保存 | `shixu.snapshot.v1` 写入 1 条 `source=manual` 记录；`/memories` 刷新后可见 |
| 无 Key AI 降级 | 点击「让 AI 建议心情」 | 返回固定提示「识别暂时不可用，可手动选择心情或稍后再试。」，草稿保留，手选可保存 |

以上均为本地静态服务与模拟路由验证，**不是 Qoder Sites 公网验收**。

## 6. AI 与成本保护

- 静态部署不包含 `/api/emotion`，因此不消耗模型配额，也没有服务端 Key 暴露面。
- AI 按钮仍会请求 `/api/emotion` 并按 404/非 JSON 映射为固定错误；不影响手选与保存。
- 若后续要恢复 AI，必须把 Provider 逻辑移植为 `/functions/v1/app` 的 Edge Function：
  - 使用 `Deno.env.get` 读取 `MODEL_API_KEY` / `BAILIAN_WORKSPACE_ID`；
  - 不能直接用现有 `server-only`、`process.env` 与单进程 `protection.ts`；
  - Edge 实例级内存计数不等于全局限流/预算，公开前需平台层或持久化存储补齐。
- S8-02 真实账号与计费仍未核实，AI 不在本站点首发的验收范围内。

## 7. 推荐部署操作（待用户授权）

1. 本地执行 `npm run build:export`，确认 `out/` 为最新产物。
2. 使用 Qoder Sites `prepare_site`：
   - `projectRoot`：仓库根目录；
   - `webDirectory`：`out`；
   - `spa: false`；
   - 不传 `functionDirectory`、`databaseAccess`、`secretNames`。
3. 在 Draft 预览中逐页检查 `/`、`/diary`、`/memories`、`/wishes` 的直接访问与刷新，并在 DevTools Network 确认 `*_rsc` 与 `__next.*.txt` 请求为 200。
4. 用户明确授权后再 `publish_site`；不得自动公开或合并 PR。

## 8. 未验证与剩余风险

- Qoder Sites 实际静态路由与尾斜杠行为尚未验证：私有 Draft 主机对未认证探测返回 503，需用户在已登录的 Draft 预览中确认 `/diary/`、`/diary` 与 RSC 分段请求。本地 `serve` 将 `/diary/` 回落到 `diary.html` 并返回 200；应用内部导航不产生尾斜杠，因此未额外生成目录索引别名。
- 自动 Link 预取未在内置浏览器中自然触发（窗口不可见、视口 0×0）；已按客户端构造规则逐一请求全部 RSC 分段并完成客户端导航，结果为 200。
- 公网 URL、分享策略、访问控制、构建/发布耗时。
- 移动端、跨浏览器与真实设备。
- AI Edge Function 移植、真实百炼调用、Edge 限流与预算。
- `/character-preview` 已从静态产物移除，静态部署下该路径返回 404；常规 `next build` 仍保留该开发预览页（既有 Issue #26 的原有行为不受影响）。

## 9. 边界

- 不自动部署到公网，不创建付费云资源，不调用真实模型。
- 不修改 S8-02 分支 `feature/stage8-bailian-live`。
- 不合并 PR；合并与公开发布均由用户决定。

## 10. S8-03E 子页面 404 修复（2026-11-18）

### 10.1 真实验收与根因

在已登录的 Qoder 内置浏览器访问私有站点 `https://shixu-486cn1yd59z.qoder.zone`，逐路径读取状态码与内容类型：

| 路径 | 状态 | 说明 |
| --- | --- | --- |
| `/` | 200 text/html | 首页 |
| `/diary`、`/memories`、`/wishes` | 404 | 无扩展名路径 |
| `/diary.html`、`/memories.html`、`/wishes.html` | 200 text/html | 精确文件 |
| `/index`（`index.html` 存在、无 `index/` 目录） | 404 | 证明不存在“无扩展名 → `.html`”映射 |
| `/diary/`、`/memories/`、`/wishes/` | 200 text/html | 实际返回首页内容，不是对应页面 |
| `/diary/__next.diary.__PAGE__.txt`、`/diary.txt` | 200 text/plain | RSC 分段文件正常 |
| `/unknown-xyz`、`/character-preview` | 404 | 未知路径与未发布页 |

结论：Qoder Sites 静态托管**只按精确文件键响应**，没有无扩展名到 `.html` 的映射、没有目录索引、没有尾斜杠重定向；`/diary/` 会回落到根 `index.html`。`prepare_site` 生成的 `qoder-sites.json` 也固定 `subdirectory_index.enabled=false`，且不提供 rewrite/redirect 参数。

### 10.2 方案评估

| 方案 | 结论 |
| --- | --- |
| 平台原生 rewrite/redirect | 不可用：`prepare_site` 不接受路由规则，Skills 明确不执行任意 rewrite；宿主没有自定义路由入口 |
| `trailingSlash: true` + 目录索引 | 不可用：目录索引被平台关闭；`/diary/` 实测返回首页 |
| 静态路由文件别名 | 不可行：`/diary` 需要根级无扩展名文件，但 `diary/` 已被 RSC 分段占用；删目录会导致 RSC 404，且无扩展名文件的 MIME 未经平台验证 |
| 最小客户端导航适配 | 采用：内部导航改为平台已支持的 `.html` 文件链接并整页导航；不使用 SPA fallback，不掩盖 404 |

### 10.3 实现

- 新增 `src/lib/appPaths.ts`：`appHref()` 在静态导出构建中为子页面追加 `.html`；`normalizeAppPath()` 让活动态与页面外壳在 `.html` URL 下保持正确；`requiresFullPageNavigation()` 区分必须整页跳转的静态子页面。
- `scripts/build-static.mjs` 传入 `NEXT_PUBLIC_STATIC_EXPORT=1`；常规 `next dev/build/start` 仍使用干净路径。
- `AppSidebar` 仅在静态导出的子页面使用普通 `<a href="*.html">`；根路径 `/` 与常规 Next.js 模式保留 `next/link` 客户端导航。`AppShell` 统一归一化路径，活动导航与页面外壳在 `.html` URL 下保持正确。
- `DiaryHistory`：未保存草稿拦截改为 `window.location.assign`，并跳过二次 `beforeunload` 提示。
- 保留 Windows RSC 分段归一化与 `character-preview` 产物移除。

### 10.4 验证

本地用与实测托管一致的“精确文件键”静态服务验证：

- `/`、`/diary.html`、`/memories.html`、`/wishes.html` 直接访问与刷新均 200；四个 `.html` 页面通过导航链接整页切换，活动导航与 `home-shell`/`memories-shell`/`wishes-shell` 正确。
- 页面水合正常（心情按钮可交互）。
- 17 个 HTML 内引用的站内资源/链接全部存在；`_next` JS/CSS 200。
- `/unknown-xyz`、`/character-preview` 404；`/diary` 404 为平台精确键行为。
- RSC 分段文件保留且 200；子页面 `.html` 导航不再发起 RSC 请求，返回 `/` 的客户端导航仍正常加载根路由 RSC 分段。
- `npm run build` 仍通过，`/api/emotion` 保持动态。

### 10.5 未验证与边界

- 新构建尚未重新发布；`.html` 路径本身已在现有私有站点实测 200，但整页导航后的完整页面组合需发布后复验（需用户单独授权 `prepare_site`/`publish_site`）。
- 干净 URL（`/diary`）在当前 Qoder Sites 上无法由应用产物修复；需要平台提供 URL rewrite/redirect 或目录索引能力。若后续平台开放，可恢复 SPA 导航并移除 `.html` 适配。
- `/diary/` 等尾斜杠路径仍由平台返回首页，应用不生成此类链接。
- 移动端、跨浏览器与真实设备仍未验证。

## 11. S8-03E 复核：Qoder Sites 生产路由能力（2026-11-18）

### 11.1 源码级托管契约

本轮不再依赖 ESA Pages 文档推断，直接核对本机 Qoder 安装的 Sites Skills 与打包器实现：

- `prepare_site` 入参只有 `spa` 布尔值，且 `additionalProperties: false`；不存在 rewrite、redirect、目录索引、自定义错误页或按路径规则等参数。
- 本地 `qoder.sites` 扩展打包器（`extensions/qoder.sites/dist/node/main.cjs` 的 `buildPackage`）无条件写入以下托管配置，应用无法覆盖：

  ```json
  {"formatVersion":2,"web":{"root":"web","hosting":{"index_document":"index.html","subdirectory_index":{"enabled":false,"missing_file_rule":"no_such_key"},"error_document_response_code":404}}}
  ```

  `spa=true` 时只会额外写入 `error_document: "index.html"` 并把错误响应码改为 200，即所有未知路径返回首页且状态 200。
- Skills 文档同样写明：目录索引始终关闭；`spa: true` 生成 `index.html` 错误兜底；工具参数不执行构建命令或任意 rewrite。
- 该行为与阿里云 OSS 静态网站托管在“未开通子目录首页 + 文件 404 规则 NoSuchKey”下的语义一致：对象请求 `/diary` 严格按 key 命中，不存在即 404；目录请求 `/diary/` 返回根 `index.html`。这解释了实测 `/diary/` 为 200 但内容是首页。

### 11.2 方案复核

| 方案 | 复核结果 |
| --- | --- |
| 平台原生 rewrite/redirect | 不存在对应入参或宿主配置入口。唯一平台兜底 `spa: true` 会把未知路径变成 200 首页，明确排除 |
| `trailingSlash: true` + 目录索引 | 目录索引在打包器内硬编码关闭，应用无法打开；`/diary/` 实测返回首页 |
| 静态路由文件别名（根级无扩展名文件） | 平台可按精确 key 命中 `diary`，但存在两项未证实/阻塞条件：① `diary` 文件与 RSC 分段目录 `diary/` 在磁盘同名冲突，必须删除分段目录；② 无扩展名对象的 Content-Type 由上传/存储侧决定，Qoder 未公开也未验证，若为 `application/octet-stream` 浏览器会下载而非渲染；③ 验证必须再次私有 draft/发布。按本轮“不盲改未证实能力”的约束不采用 |
| 最小客户端导航适配 | 采用：子页面内部导航改为 `.html` 文件链接并整页导航；不使用 SPA fallback，未知路径仍为 404 |

### 11.3 结论与验收边界

- 在当前 Qoder Sites 托管契约下，`/diary`、`/memories`、`/wishes` **无法返回各自页面**；这是平台路由限制，不是应用路由或构建错误。
- 已交付的最小替代方案是 `.html` 规范链接：四页可通过 `/diary.html`、`/memories.html`、`/wishes.html` 直接访问、刷新与整页跳转；未知路径与 `/character-preview` 仍返回 404。
- 要满足“干净 URL”验收，需要平台提供 rewrite/redirect/目录索引之一；或在用户授权后准备一次私有 draft，验证无扩展名别名的实际 Content-Type。
- 本轮未执行 `prepare_site`/`publish_site`，未修改或删除现有私有站点。

### 11.4 本轮本地复核

- `npm run build:export` 通过；日志 `[build-static] normalized 6 RSC segment file(s)`；`out/` 无 `character-preview*` 产物。
- 精确 key 服务（模拟 `index_document`、关闭目录索引、`NoSuchKey` 404、`/subdir/` 回落根首页）：`/`、`/diary.html`、`/memories.html`、`/wishes.html` 200；`/diary`、`/memories`、`/wishes`、`/unknown-xyz`、`/character-preview` 404；`/diary/` 200 首页；RSC 分段 200；JS/CSS/SVG/WebP 200。
- 浏览器：四页导航、直接访问、刷新均正常；活动导航与 `home-shell`/`memories-shell`/`wishes-shell` 正确；水合后可交互；控制台无消息；从 `.html` 页点击品牌返回 `/` 时 `/index.txt?_rsc=` 200，无 404。
- 以上为本地精确 key 模拟，**不是真实托管验收**。

### 11.5 决策点

1. 接受 `.html` 规范 URL（当前分支），发布后复验四页直接访问、刷新与导航。
2. 授权准备一次私有 draft，验证无扩展名别名（`web/diary`、`web/memories`、`web/wishes`）的 Content-Type；若为 `text/html` 再实现干净 URL，否则回退 `.html`。
3. 等待平台提供 rewrite/redirect 或目录索引能力。

## 12. PR #54 合并前导航回归复核与修复（2026-11-18）

### 12.1 复核发现

- 常规 Next.js 模式下所有侧栏导航都被无条件改为 `<a>`，页面间切换退化为整页重载。
- 日记草稿与保存反馈只存在于 AppProvider 内存：整页重载后草稿静默丢失，保存后的一次性企鹅反馈也不再触发。
- 回忆手账在 `.html` 当前页点击活动导航会整页刷新；未保存正文虽会触发浏览器提示，但绕过应用内确认。

### 12.2 修复（仅运行时兼容，不改领域规则/存档结构）

- `AppSidebar` 仅对静态导出子页面输出 `<a href="*.html">`；根路径与常规模式恢复 `next/link` 客户端导航。
- 日记草稿写入 `sessionStorage`（标签页内、非正式存档），挂载后恢复；保存成功清空。
- 保存反馈在 `CONFIRM_ENTRY` 成功后写入 `sessionStorage`，重载时按既有 `saveFeedbackTtlMs` 恢复；真正开始展示（`markSaveFeedbackStarted`）或过期即清除，保持一次性。
- 回忆页在草稿未保存时阻止同地址整页重载；离开确认仍使用原生提示并手动导航。
- 正式快照、五维评分、离线生活、久别重逢与愿望存储结构未改动。

### 12.3 本轮交互验证

- 常规 `next dev`（3414）与 `next start`（3002）：导航链接为无扩展名路径，跨页切换保持 SPA（页面内标记存活），日记草稿保留。
- 静态精确键服务（4567）：`/`、`/diary.html`、`/memories.html`、`/wishes.html` 直接访问、刷新、整页切换正常；活动导航与 `home-shell`/`memories-shell`/`wishes-shell` 正确。
- 静态模式：日记草稿经 `/diary.html → /memories.html → /diary.html` 整页切换后恢复；保存后经 `.html` 子页再返回 `/`，一次性反馈与开心爱心正常出现，只展示一次；随后页面恢复自主行为。
- 回忆页：未保存正文离开确认可取消/确认；活动导航同地址点击被阻止；草稿未保存时翻页提示且页码不变。
- 许愿屋：愿望写入后刷新仍存在。
- 多次页面切换与重载后离线事件为 0、无待处理重逢，未出现重复结算。
- 控制台无错误；静态页返回 `/` 的 RSC 分段请求均 200。
- `npm run lint`、`npm run typecheck`、`npm run build:export`（normalized 6 RSC segment files）、`npm run build` 均通过。

### 12.4 边界

- 以上为本地精确键模拟与浏览器交互验证，不是 Qoder Sites 真实托管验收；未执行 `prepare_site`/`publish_site`。
- 干净 URL 仍需平台能力，本轮决策为接受 `.html` 规范 URL。