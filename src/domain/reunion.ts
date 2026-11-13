import { REUNION_V1 } from "@/config/reunion";
import type { OfflineLifeEvent } from "./offlineLife";
import type { DimensionId } from "./personality";

export interface ReunionState {
  lastTriggeredWindowStart: number | null;
  lastTriggeredAt: number | null;
}

export interface ReunionTemplate {
  tone: string;
  generic: string;
  activityLines: Record<string, string>;
}

export interface ReunionRuleConfig {
  rulesVersion: "reunion-v1";
  thresholdMs: number;
  baseQuestion: string;
  templates: Record<DimensionId, ReunionTemplate>;
}

export interface ReunionGreeting {
  windowStart: number;
  dominantId: DimensionId;
  tone: string;
  message: string;
  question: string;
  rulesVersion: string;
}

export type ReunionReasonCode =
  | "triggered"
  | "no-baseline"
  | "within-threshold"
  | "already-triggered";

export interface ReunionEvaluationInput {
  now: number;
  lastActiveAt: number | null;
  lastVisitAt: number | null;
  lastTriggeredWindowStart: number | null;
  dominantId: DimensionId;
  // 本次窗口已规划的离线事件；仅用于挑选不虚构的具体生活描述。
  offlineEvents?: OfflineLifeEvent[];
  // 同标签页 sessionStorage 救援时间戳；只抬高判定基准，不改变窗口起点。
  activityRescueAt?: number | null;
}

export interface ReunionEvaluation {
  triggered: boolean;
  windowStart: number | null;
  reasonCode: ReunionReasonCode;
  absenceMs: number | null;
  greeting: ReunionGreeting | null;
}

// 纯函数：不写存档、不调用 Date.now()/Math.random()/网络/AI；相同输入得到相同结果。
// 基准为 lastActiveAt ?? lastVisitAt；严格超过 thresholdMs 才触发；同一窗口只触发一次。
export function evaluateReunion(
  input: ReunionEvaluationInput,
  config: ReunionRuleConfig = REUNION_V1,
): ReunionEvaluation {
  const baseline = input.lastActiveAt ?? input.lastVisitAt;
  if (baseline === null) {
    return { triggered: false, windowStart: null, reasonCode: "no-baseline", absenceMs: null, greeting: null };
  }

  if (
    input.lastTriggeredWindowStart !== null &&
    input.lastTriggeredWindowStart >= baseline
  ) {
    return { triggered: false, windowStart: baseline, reasonCode: "already-triggered", absenceMs: null, greeting: null };
  }

  // 同一标签页刷新时，救援值代表更近的真实活动时间；只用于判定缺席，窗口起点仍是 snapshot 基准。
  const rescue = input.activityRescueAt;
  const effectiveBaseline =
    rescue !== null && rescue !== undefined && Number.isFinite(rescue) && rescue <= input.now && rescue > baseline
      ? rescue
      : baseline;
  const absence = input.now - effectiveBaseline;
  if (!(absence > config.thresholdMs)) {
    return { triggered: false, windowStart: baseline, reasonCode: "within-threshold", absenceMs: absence, greeting: null };
  }

  return {
    triggered: true,
    windowStart: baseline,
    reasonCode: "triggered",
    absenceMs: absence,
    greeting: buildGreeting(baseline, input, config),
  };
}

function buildGreeting(
  windowStart: number,
  input: ReunionEvaluationInput,
  config: ReunionRuleConfig,
): ReunionGreeting {
  const template = config.templates[input.dominantId];
  const windowEvents = (input.offlineEvents ?? []).filter((event) => event.windowStart === windowStart);
  const latest = windowEvents.length > 0 ? windowEvents[windowEvents.length - 1] : null;
  const message = latest ? template.activityLines[latest.activityId] ?? template.generic : template.generic;
  return {
    windowStart,
    dominantId: input.dominantId,
    tone: template.tone,
    message,
    question: config.baseQuestion,
    rulesVersion: config.rulesVersion,
  };
}
