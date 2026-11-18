# 任务卡：阶段八 S8-03 部署兼容性预检

> 状态（2026-11-18）：**预检完成，Windows RSC 404 已修复，未发布**。本分支只做 Qoder Sites 兼容性探针与最小构建适配；未创建公网站点、未创建付费云资源、未调用真实模型。
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