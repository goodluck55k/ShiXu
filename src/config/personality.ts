import type { PersonalityRuleConfig } from "@/domain/personality";

// 候选参数，待验收；此版本的初始分与边界也是 v3 存档不变量。
export const PERSONALITY_V2: PersonalityRuleConfig = {
  rulesVersion: "personality-v2",
  dimensions: [
    { id: "gentleness", label: "温柔", description: "柔和地陪伴" },
    { id: "curiosity", label: "好奇", description: "观察与探索" },
    { id: "cheerfulness", label: "开朗", description: "活跃与互动" },
    { id: "fearfulness", label: "害怕", description: "谨慎与自我保护" },
    { id: "low_mood", label: "低落", description: "安静与沉思" },
  ],
  dominantPriority: ["gentleness", "curiosity", "cheerfulness", "fearfulness", "low_mood"],
  initialScore: 50, minScore: 20, maxScore: 80, perSaveCap: 3, dailyNetCap: 4,
  intensityBands: { lowExclusive: 0.35, highInclusive: 0.7, factors: [0.5, 1, 1.5] },
  roomFactor: 1,
  emotionDeltas: {
    joy: { gentleness: 1, curiosity: 1, cheerfulness: 3, fearfulness: -2, low_mood: -2 },
    calm: { gentleness: 2, curiosity: 0, cheerfulness: 1, fearfulness: -2, low_mood: -2 },
    sadness: { gentleness: 1, curiosity: -1, cheerfulness: -2, fearfulness: 1, low_mood: 3 },
    anxiety: { gentleness: 0, curiosity: -2, cheerfulness: -2, fearfulness: 3, low_mood: 1 },
    anger: { gentleness: -2, curiosity: -1, cheerfulness: -1, fearfulness: 2, low_mood: 1 },
    tired: { gentleness: 0, curiosity: -2, cheerfulness: -2, fearfulness: 0, low_mood: 2 },
    mixed: { gentleness: 0, curiosity: 0, cheerfulness: 0, fearfulness: 0, low_mood: 0 },
    neutral: { gentleness: 0, curiosity: 0, cheerfulness: 0, fearfulness: 0, low_mood: 0 },
    unknown: { gentleness: 0, curiosity: 0, cheerfulness: 0, fearfulness: 0, low_mood: 0 },
  },
  descriptions: {
    gentleness: { low: "它有自己的步调，安静地陪在这里。", balanced: "它愿意轻轻地陪伴，留意身边的一切。", high: "它常常带着温柔，静静陪伴着你。" },
    curiosity: { low: "它更愿意停下来，待在熟悉的地方。", balanced: "它偶尔会好奇地看看周围。", high: "它喜欢观察新事物，四处探索。" },
    cheerfulness: { low: "它喜欢安静地待着，慢慢感受时间。", balanced: "它偶尔会活跃起来，与你打个招呼。", high: "它常常活泼地活动，向你表达亲近。" },
    fearfulness: { low: "它在熟悉的空间里自在地待着。", balanced: "它会谨慎地观察，也喜欢熟悉的角落。", high: "它喜欢待在安心的角落，小心地观察周围。" },
    low_mood: { low: "它以自己的节奏，安静地度过时光。", balanced: "它有时喜欢独处，静静地想事情。", high: "它最近更喜欢安静独处，慢慢度过时光。" },
  },
  bands: { lowMax: 42, highMin: 58 }, rounding: "half-away-from-zero",
};
export const PERSONALITY_RULES: Readonly<Record<string, PersonalityRuleConfig>> = { [PERSONALITY_V2.rulesVersion]: PERSONALITY_V2 };

export function getPersonalityRule(version: string): PersonalityRuleConfig | undefined {
  return Object.hasOwn(PERSONALITY_RULES, version) ? PERSONALITY_RULES[version] : undefined;
}
