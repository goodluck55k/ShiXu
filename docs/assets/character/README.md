# 企鹅正面母版预览

1. 在仓库根目录运行 `npm install`（已有依赖可跳过），然后运行 `npm run dev`。
2. 在 Windows 浏览器打开 http://localhost:3000/character-preview。
3. 左侧为用户提供的正面裁图，右侧为 React SVG；下方提供不同尺寸、背景和放大细节。

页面只在开发模式呈现，生产模式返回 Next.js 的未找到页面（流式响应可能使用 HTTP 200）；没有产品导航入口。`front-comparison.png` 是浏览器截图，视觉仍待用户验收。参考图片由用户提供，完整设计板与正面裁图仅用于本次对照；它们不是 SVG 图层或运行时角色素材。
