import type { ReunionRuleConfig } from "@/domain/reunion";

// 候选参数与候选文案，待验收。阈值与五种主导问候统一在此配置，不硬编码到组件或领域逻辑。
// 基础问句「最近过得还好吗？」为已确认产品文案；各主导的 message 为候选文案。
export const REUNION_V1: ReunionRuleConfig = {
  rulesVersion: "reunion-v1",
  thresholdMs: 72 * 60 * 60 * 1000,
  baseQuestion: "最近过得还好吗？",
  templates: {
    gentleness: {
      tone: "轻声、柔和，不追问",
      generic: "我最近把房间收拾得整齐了一些，也给窗边的植物浇了水。",
      activityLines: {
        tidy_room: "我最近把房间慢慢整理了一遍。",
        care_plant: "我最近照看了窗边的植物，它长出了新的叶子。",
        quiet_rest: "我最近安静地休息了一阵子，也把家里收拾得舒服了一点。",
      },
    },
    curiosity: {
      tone: "带着发现，轻轻邀请",
      generic: "我最近在房间里发现了几样以前没留意的小东西。",
      activityLines: {
        explore_room: "我最近把房间的角落都走了一遍，发现了几处有趣的地方。",
        observe_new: "我最近观察到一个很有意思的小东西，想留给你看看。",
        collect_finds: "我最近收集了几个小发现，正等着你来一起看看。",
      },
    },
    cheerfulness: {
      tone: "轻快、开心",
      generic: "我最近自己玩了一会儿，心情轻快了不少。",
      activityLines: {
        play: "我最近自己玩了一会儿，还试着蹦了几下。",
        dance: "我最近跳了一小段舞，脚步都轻快起来了。",
        try_game: "我最近试了一个小游戏，玩得挺开心。",
      },
    },
    fearfulness: {
      tone: "小心、不施压",
      generic: "我最近大多待在熟悉的角落里，慢慢看了看周围。",
      activityLines: {
        familiar_corner: "我最近待在熟悉的角落里，那里让我安心一些。",
        careful_explore: "我最近小心地看了看周围，确认一切都还是熟悉的样子。",
      },
    },
    low_mood: {
      tone: "安静、不要求振作",
      generic: "我最近常常安静地坐一会儿，发发呆，也好好休息了。",
      activityLines: {
        zone_out: "我最近常发一会儿呆，让脑子慢慢安静下来。",
        sleep: "我最近多睡了一会儿，也让自己慢慢缓下来。",
        window_think: "我最近常靠着窗坐一会儿，看看外面，也想了想事情。",
      },
    },
  },
};
