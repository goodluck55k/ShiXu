## 任务卡：阶段九 PR ① 生命层与场景融合（分支 feature/stage9-life-layer）

### 归属与目标
- 模块：角色展示（`src/components/character/`、`src/app/globals.css` 角色段）。
- 目标：企鹅在所有动作下持续眨眼、轻微呼吸、视线跟随指针、偶尔歪头；动作衔接更自然；小屋中投影与光影更贴合插画。设计见 [STAGE9_DESIGN](STAGE9_DESIGN.md) §2。

### 输入与输出
- 输入：现有 `CharacterView`（只读）、指针位置（仅小屋场景、仅展示）。
- 输出：纯展示变化；不产生事件、不调用 `applyGameEvent`、不写存档。

### 公共契约
- 不变。`CharacterRenderer`/`PenguinFace` 只增加内部分组与 CSS 类；`CharacterView`、`BehaviorDecision` 不变。

### 配置与版本
- 不改 `behavior-v2` 规则与参数；动效时长、幅度为展示层 CSS 值（视觉候选，随 PR 截图验收）。

### 依赖与边界
- 明确不做：拆分企鹅母版、引入动画库、改页面布局/侧栏/状态卡、改行为调度、台词（PR ②）、新动作（PR ③）。
- 视线跟随不使用 `Math.random`，不影响行为；页面隐藏/暂停时生命层暂停；`prefers-reduced-motion` 下关闭生命层与视线。

### 最小验收
- 小屋 1440×900 与 390 宽：企鹅可见眨眼、呼吸、视线跟随；走动、坐下、特殊动作、保存反馈不回归。
- 低动态偏好：企鹅静态显示。
- `typecheck`、`lint`、`build` 通过。

### 存档与迁移
- 无。

### 风险与待确认
- 投影、边缘光强度与企鹅尺寸为视觉候选，待用户截图验收。
