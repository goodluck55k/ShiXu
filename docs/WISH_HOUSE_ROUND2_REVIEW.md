# 许愿屋第二轮视觉差异与验证

基线：`ee91185674ba4935f7081853bc5a5c439ea48395`；本轮是原 PR #43 的视觉精修。截图由本机 Chrome Headless 以真实页面生成，带内容者为明确标注的开发隔离样例，不代表正式存档。长图中固定底栏按浏览器截图位置叠在页面上；实际滚动至输入区域的位置见对应截图。

## 与确认图及第一轮对照

- **光影**：第一轮窗外主要为模糊圆斑、桌面为大块平色；本轮增加远景植物轮廓、低对比窗帘明暗、斜向桌面光线、细木纹和接触阴影。确认图的自然笔触、复杂景深与光线漫射仍更丰富，SVG 渐变和有限静态路径只能近似。
- **玻璃**：保留杯口双层边缘、暗面和不对称反光，补充侧缘折射暗影与底部厚度线。透明杯内内容可见；真实背景扭曲和手绘不规则反射仍未模拟。
- **纸团**：规则三角晶面改为不规则边缘、漫反射与不对称折痕，宝石感显著减弱；当前纸团仍共享基础轮廓，旋转和尺寸提供有限变化，细节较插画概念图简化。
- **企鹅与场景**：沿用已验收企鹅母版并保留原比例，桌面接触阴影增强；企鹅线条仍比绘本背景清晰，材质差异可见。
- **桌面布局**：公共侧栏、企鹅与杯、右侧面板及底部输入布局未改变。1440、1920 实测无横向溢出。
- **手机**：压缩品牌留白和主视觉高度，列表高度限制为 158px；390 样例输入区顶部从第一轮长图约 894px 前移到约 781px。面板内部可触摸滚动，键盘聚焦后 End 可到达末尾；完整数据未截断。实际滚动到输入框时，输入框底部 759px，固定导航顶部 782px。
- **待最终验收的候选参数**：手机场景高度与列表 158px 上限、玻璃反光强度、纸团纹理、桌面光线与既有 8/5 个可见纸团/星星上限；并非确认图的像素级复刻。

## 截图索引

| 桌面 | 手机与状态 |
| --- | --- |
| [1440×900](assets/wish-house-review-round2/desktop-1440x900.png) · [1920×1080](assets/wish-house-review-round2/desktop-1920x1080.png) | [390×844](assets/wish-house-review-round2/mobile-390x844.png) · [390 长图](assets/wish-house-review-round2/mobile-390-full.png) |
| [玻璃杯](assets/wish-house-review-round2/closeup-jar.png) · [纸团](assets/wish-house-review-round2/closeup-paper.png) | [375×667](assets/wish-house-review-round2/mobile-375x667.png) · [360×780](assets/wish-house-review-round2/mobile-360x780.png) |
| [企鹅与杯](assets/wish-house-review-round2/closeup-penguin-jar.png) · [窗景桌面](assets/wish-house-review-round2/closeup-window-table.png) | [输入与底栏](assets/wish-house-review-round2/mobile-input-navigation.png) · [生产空状态](assets/wish-house-review-round2/production-empty.png) |

## 验证

`npm run typecheck`、`npm run lint`、`npm run build` 均通过。Chrome 实测上述五个宽度无横向溢出，四页导航四入口及桌面坐标一致，既有三页回归截图未见明显退化；生产构建带 `?preview=sample` 仍为零愿望空状态。样例标签切换、列表键盘滚动、输入保留与开发中提示正常；低动态媒体设置下星光动画关闭。页面未捕获 JavaScript 异常。未进行真实愿望持久化或跨设备验证。

截图中的左下角圆形 N 是 Next.js 开发工具指示，不属于产品 UI。P0/P1：本轮验证未发现。
