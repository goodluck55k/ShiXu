import "server-only";

import type { AiConfig } from "./config";

// 公开部署成本保护（docs/AI_CONTRACT.md §2.5）：进程内频率 / 并发 / 预算。
// 单实例部署下即服务端强制边界；多实例公开部署需由部署平台叠加同等保护（见 PR 说明）。

const RATE_WINDOW_MS = 60000;

let requestTimes: number[] = [];
let inFlight = 0;
let callsUsed = 0;

export type ProtectionRejection = "rate" | "concurrency" | "budget";

export function tryAcquire(config: AiConfig, now: number): { ok: true } | { ok: false; rejection: ProtectionRejection } {
  requestTimes = requestTimes.filter((time) => now - time < RATE_WINDOW_MS);
  if (requestTimes.length >= config.ratePerMinute) return { ok: false, rejection: "rate" };
  if (inFlight >= config.maxConcurrent) return { ok: false, rejection: "concurrency" };
  if (callsUsed >= config.callBudget) return { ok: false, rejection: "budget" };
  requestTimes.push(now);
  inFlight += 1;
  callsUsed += 1;
  return { ok: true };
}

export function release(): void {
  inFlight = Math.max(0, inFlight - 1);
}