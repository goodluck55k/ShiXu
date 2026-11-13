# 阶段二任务卡：五维性格与持久化

- 归属：personality、storage；依赖已合入的日记、情绪确认、存储及旧 companion 契约。
- 输入：CONFIRM_ENTRY、CORRECT_EMOTION、EDIT_ENTRY_TEXT 与应用层提供的时间、dayKey 和 eventId；输出：v3 快照、只读 PersonalitySnapshot。
- 状态所有权：五维贡献台账、主导标记和规则版本；不拥有日记正文、行为或渲染状态。
- 公共契约：新增 PersonalityState、PersonalityContribution、PersonalitySnapshot、PersonalityRuleConfig 及查询；Snapshot v2→v3，旧字段进入 legacy；调用方仅消费只读结果。
- 配置：personality-v2；初始 50、上下限 20/80、单次 ±3、每日 ±4、强度分档及并列顺序依 COMPANION_SPEC；参数待验收。旧三维每日上限 6 仅用于兼容校验。
- 迁移：v1→v2→v3 内存迁移，原样保留历史和 legacy，不追溯；保存成功后才写入。损坏或未来版本保留原始数据。
- 不做：行为、离线生成、重逢、AI 重构、视觉重设计、饰品与旧分数换算。
- 验收：评分、额度与越界、纠正和幂等、主导切换、版本缺失、迁移、保存失败和刷新，以及页面最小冒烟；不调用真实模型。
