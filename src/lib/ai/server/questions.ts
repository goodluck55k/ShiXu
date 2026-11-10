// docs/AI_CONTRACT.md §2.2 的五问定义（一次请求，Choice + 4×Score）。
// 该对象同时用于构造 Provider 请求与校验原生响应的键集 / legend。

export const LABEL_CRITERIA: Record<string, string> = {
  joy: "开心、喜悦",
  calm: "安心、放松",
  sadness: "悲伤、失落",
  anxiety: "焦虑、担忧",
  anger: "愤怒、恼火",
  tired: "疲惫、乏力",
  mixed: "多种明显矛盾情绪并存",
  neutral: "可判断为中性、平常",
  unknown: "信息不足以判断",
};

export const SCORE_CRITERIA: Record<"valence" | "arousal" | "dominance" | "intensity", string[]> = {
  valence: ["极不愉快", "中性或愉快与不愉快相当", "极愉快"],
  arousal: ["极低唤醒、困倦平缓", "中等唤醒", "极高唤醒、激动紧张"],
  dominance: ["极低控制感、无助", "中等控制感", "极高控制感、从容有把握"],
  intensity: ["情绪很淡或几乎没有", "中等强度", "情绪极强烈"],
};

export const SCORE_INSTRUCTIONS: Record<"valence" | "arousal" | "dominance" | "intensity", string> = {
  valence: "作者表达的愉快程度，不评判情绪好坏。",
  arousal: "作者表达的激动或唤醒程度，与积极程度分开。",
  dominance: "作者表达的主观控制感，不是对他人的支配权。",
  intensity: "作者表达的情绪强度，与激动程度分开。",
};

export const DIMENSION_QUESTION_KEYS = ["valence", "arousal", "dominance", "intensity"] as const;
export type DimensionQuestionKey = (typeof DIMENSION_QUESTION_KEYS)[number];

export const ANSWER_KEYS = ["label", ...DIMENSION_QUESTION_KEYS] as const;

export function buildEmotionQuestions() {
  return {
    label: {
      type: "choice",
      instructions: "判断作者当前主要心情；明显矛盾并存选 mixed，信息不足选 unknown。",
      criteria: { ...LABEL_CRITERIA },
    },
    valence: { type: "score", instructions: SCORE_INSTRUCTIONS.valence, criteria: [...SCORE_CRITERIA.valence] },
    arousal: { type: "score", instructions: SCORE_INSTRUCTIONS.arousal, criteria: [...SCORE_CRITERIA.arousal] },
    dominance: { type: "score", instructions: SCORE_INSTRUCTIONS.dominance, criteria: [...SCORE_CRITERIA.dominance] },
    intensity: { type: "score", instructions: SCORE_INSTRUCTIONS.intensity, criteria: [...SCORE_CRITERIA.intensity] },
  };
}