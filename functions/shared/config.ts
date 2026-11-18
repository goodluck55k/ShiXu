// 两个运行时共用的配置解析辅助；不读取任何环境变量。
// Deno 侧由 functions/config.ts 注入 env getter，Node 侧由 src/lib/ai/server/config.ts 读取 process.env。

export const AI_TIMEOUT_MS = 15000;
export const DEFAULT_MODEL_NAME = "decision-model-preview";
export const MOCK_MODEL_NAME = "mock-demo";

export function positiveInt(raw: string | undefined, fallback: number): number {
  if (raw === undefined) return fallback;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export function nonEmpty(raw: string | undefined): string | null {
  const trimmed = raw?.trim();
  return trimmed ? trimmed : null;
}

export function resolveBaseUrl(explicit: string | undefined, workspace: string | undefined): string | null {
  const configured = nonEmpty(explicit);
  if (configured) {
    const url = configured.replace(/\/+$/, "");
    const isLocal = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/.test(url);
    if (url.startsWith("https://") || isLocal) return url;
    return null;
  }
  const workspaceId = nonEmpty(workspace);
  // 决策模型必须使用业务空间专属域名（北京地域；其他地域用 MODEL_BASE_URL 覆盖）
  if (workspaceId && /^[A-Za-z0-9-]+$/.test(workspaceId)) {
    return `https://${workspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1`;
  }
  return null;
}
