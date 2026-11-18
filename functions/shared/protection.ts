import type { EmotionProtection, ProtectionLimits } from "./types.ts";

// 公开部署成本保护（docs/AI_CONTRACT.md §2.5）：进程/实例内频率、并发与调用预算。
// 这是单实例内的尽力保护，不是跨 Edge 实例的全局配额；Edge 真实模型调用默认关闭，
// 多实例可靠预算必须由平台能力或持久化计数器补齐（见 docs/AI_CONTRACT.md）。

const RATE_WINDOW_MS = 60000;

export function createInMemoryProtection(): EmotionProtection {
  let requestTimes: number[] = [];
  let inFlight = 0;
  let callsUsed = 0;

  return {
    tryAcquire(limits: ProtectionLimits, now: number) {
      requestTimes = requestTimes.filter((time) => now - time < RATE_WINDOW_MS);
      if (requestTimes.length >= limits.ratePerMinute) return { ok: false as const, rejection: "rate" as const };
      if (inFlight >= limits.maxConcurrent) return { ok: false as const, rejection: "concurrency" as const };
      if (callsUsed >= limits.callBudget) return { ok: false as const, rejection: "budget" as const };
      requestTimes.push(now);
      inFlight += 1;
      callsUsed += 1;
      return { ok: true as const };
    },
    release() {
      inFlight = Math.max(0, inFlight - 1);
    },
  };
}
