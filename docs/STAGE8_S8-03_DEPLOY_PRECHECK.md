# 任务卡：阶段八 S8-03 部署兼容性预检

> 状态（2026-11-18）：**预检完成，未发布**。本分支只做 Qoder Sites 兼容性探针与最小构建适配；未创建公网站点、未创建付费云资源、未调用真实模型。
>
> 分支：`feature/stage8-deploy`（基于 `origin/main` `9c2d3da`）；PR 指向 `main`，保持 Draft，是否合并由用户决定。

## 1. 结论

- Qoder Sites 的托管模型是**静态产物 + 可选单个 Edge Function**，不运行 Next.js Node 服务、`next start` 或任意常驻进程。
- 当前仓库可通过 `output: "export"` 导出 `/`、`/diary`、`/memories`、`/wishes` 四页；`/api/emotion` 是 Node Route Handler，**不能随静态导出发布**。
- 无真实 Key 时手选保存闭环在静态产物中可用；AI 按钮会进入固定错误提示并保留草稿。
- 推荐先发布**不含 AI 的静态站点**；真实百炼联调受 S8-02 凭证阻挡，AI Edge Function 移植另行评估。

## 2. 平台约束（2026-11-18 核实）

| 项目 | 约束 |
| --- | --- |
| 构建 | `prepare_site` 不执行应用构建；必须先在本地生成静态目录并传入 `webDirectory` |
| 静态路由 | ESA Pages 文档：`/file` 响应 `file.html`；`/file.html` 307 到 `/file`；目录索引行为与 Qoder Sites Skills 的“目录索引禁用”提示不完全一致，因此不使用 trailingSlash |
| 服务端 | 仅支持 `/functions/v1/app` 单个 Edge Function（Deno，入口 `index.ts`），不支持 Next.js Route Handler |
| 保留路径 | `/api`、`/functions`、`/internal`、`/storage` 等为平台命名空间，前端不应把应用 API 放在 `/api` |
| 环境变量 | Function 通过 `Deno.env.get` 读取应用 Secret；静态产物无运行时服务端环境变量 |
| 体积 | 当前 `out/` 为 1.6 MiB、57 个文件，远低于 50 MiB 产物限制 |

## 3. 最小代码改动

| 文件 | 改动 | 原因 |
| --- | --- | --- |
| `next.config.ts` | `NEXT_STATIC_EXPORT=1` 时启用 `output: "export"` 与 `pageExtensions: ["tsx", "jsx", "js"]` | 保留本地/自托管 `next build`；导出构建排除 `route.ts`，避免 `force-dynamic` 报错 |
| `src/app/character-preview/page.tsx` | 移除 `export const dynamic = "force-dynamic"` | 该页仅开发预览；静态导出不接受 force-dynamic。生产构建不再动态渲染，`/character-preview` 仍为既有 Issue #26 的 200 未找到内容 |
| `scripts/build-static.mjs` | 新增静态导出构建入口 | Windows 下不依赖 shell 环境变量语法 |
| `package.json` | 新增 `build:export` | 一条命令生成可发布的 `out/` |

未修改五维评分、主导判定、行为权重、企鹅视觉、正式 UI、`Snapshot` v4 或愿望存储。

## 4. 已执行验证

| 验证 | 命令/方式 | 结果 |
| --- | --- | --- |
| 静态导出 | `npm run build:export` | 通过；路由表仅含四页、`/companion`、`/character-preview`，无 `/api/emotion` |
| 常规构建 | `npm run build` | 通过；`/api/emotion` 仍为动态 Route Handler，供本地/自托管使用 |
| 类型检查 | `npx tsc --noEmit` | 通过 |
| AI 契约回归 | `stage6-server.ts`、`stage6-client.ts` | 通过 |
| 产物检查 | `out/` | 1.6 MiB、57 文件；`index.html`、`diary.html`、`memories.html`、`wishes.html`、`404.html` 均存在 |
| 本地 clean URL 探针 | 按 ESA Pages 规则本地静态服务 | `/`、`/diary`、`/memories`、`/wishes` 200；`/diary.html` 307 到 `/diary`；`/api/emotion` 404 |
| 浏览器四页 | 本地 clean URL 探针 | 四页直接访问与刷新均渲染；客户端导航正常 |
| 手选保存 | `/diary` 输入正文 → 选择「安心」→ 保存 | `shixu.snapshot.v1` 写入 1 条 `source=manual` 记录；`/memories` 刷新后可见 |
| 无 Key AI 降级 | 点击「让 AI 建议心情」 | 返回固定提示「识别暂时不可用，可手动选择心情或稍后再试。」，草稿保留，手选可保存 |

以上均为本地静态服务与模拟路由验证，**不是 Qoder Sites 公网验收**。

## 5. AI 与成本保护

- 静态部署不包含 `/api/emotion`，因此不消耗模型配额，也没有服务端 Key 暴露面。
- AI 按钮仍会请求 `/api/emotion` 并按 404/非 JSON 映射为固定错误；不影响手选与保存。
- 若后续要恢复 AI，必须把 Provider 逻辑移植为 `/functions/v1/app` 的 Edge Function：
  - 使用 `Deno.env.get` 读取 `MODEL_API_KEY` / `BAILIAN_WORKSPACE_ID`；
  - 不能直接用现有 `server-only`、`process.env` 与单进程 `protection.ts`；
  - Edge 实例级内存计数不等于全局限流/预算，公开前需平台层或持久化存储补齐。
- S8-02 真实账号与计费仍未核实，AI 不在本站点首发的验收范围内。

## 6. 推荐部署操作（待用户授权）

1. 本地执行 `npm run build:export`，确认 `out/` 为最新产物。
2. 使用 Qoder Sites `prepare_site`：
   - `projectRoot`：仓库根目录；
   - `webDirectory`：`out`；
   - `spa: false`；
   - 不传 `functionDirectory`、`databaseAccess`、`secretNames`。
3. 在 Draft 预览中逐页检查 `/`、`/diary`、`/memories`、`/wishes` 的直接访问与刷新。
4. 用户明确授权后再 `publish_site`；不得自动公开或合并 PR。

## 7. 未验证

- Qoder Sites 实际静态路由是否与本地模拟一致（需一次 Draft 预览探针）。
- 公网 URL、分享策略、访问控制、构建/发布耗时。
- 移动端、跨浏览器与真实设备。
- AI Edge Function 移植、真实百炼调用、Edge 限流与预算。
- `/character-preview` 的生产 200/未找到行为（既有 Issue #26，未在本分支修复）。

## 8. 边界

- 不自动部署到公网，不创建付费云资源，不调用真实模型。
- 不修改 S8-02 分支 `feature/stage8-bailian-live`。
- 不合并 PR；合并与公开发布均由用户决定。