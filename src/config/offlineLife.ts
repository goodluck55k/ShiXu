import type { OfflineLifeRuleConfig } from "@/domain/offlineLife";

// 候选参数与候选文案，待验收。活动 id/权重/文案统一在此配置，不硬编码到组件或领域逻辑。
export const OFFLINE_LIFE_V1: OfflineLifeRuleConfig = {
  rulesVersion: "offline-life-v1",
  minAbsenceMs: 30 * 60 * 1000,
  eventIntervalMs: 90 * 60 * 1000,
  maxEventsPerWindow: 6,
  maxStoredEvents: 20,
  activities: {
    gentleness: [
      { id: "tidy_room", label: "整理房间", text: "你不在的时候，我整理了一下房间。", weight: 1 },
      { id: "care_plant", label: "照顾植物", text: "你不在的时候，我给植物浇了浇水。", weight: 1 },
      { id: "quiet_rest", label: "安静休息", text: "你不在的时候，我安静地休息了一会儿。", weight: 1 },
    ],
    curiosity: [
      { id: "explore_room", label: "探索房间", text: "你不在的时候，我在房间里四处探索。", weight: 1 },
      { id: "observe_new", label: "观察新事物", text: "你不在的时候，我观察了一些新东西。", weight: 1 },
      { id: "collect_finds", label: "收集发现", text: "你不在的时候，我收集了几个小发现。", weight: 1 },
    ],
    cheerfulness: [
      { id: "play", label: "玩耍", text: "你不在的时候，我自己玩了一会儿。", weight: 1 },
      { id: "dance", label: "跳舞", text: "你不在的时候，我跳了一小段舞。", weight: 1 },
      { id: "try_game", label: "尝试游戏", text: "你不在的时候，我试了试新游戏。", weight: 1 },
    ],
    fearfulness: [
      { id: "familiar_corner", label: "待在熟悉角落", text: "你不在的时候，我待在熟悉的角落里。", weight: 1 },
      { id: "careful_explore", label: "小心探索", text: "你不在的时候，我小心翼翼地看了看周围。", weight: 1 },
    ],
    low_mood: [
      { id: "zone_out", label: "发呆", text: "你不在的时候，我发了会儿呆。", weight: 1 },
      { id: "sleep", label: "睡觉", text: "你不在的时候，我睡了一觉。", weight: 1 },
      { id: "window_think", label: "靠窗沉思", text: "你不在的时候，我靠着窗想了些事情。", weight: 1 },
    ],
  },
};