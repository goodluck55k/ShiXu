import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { readEdgeConfig } from "../functions/config.ts";
import { buildDemoNativeResponse } from "../functions/shared/native.ts";
import { handleEmotionRequest } from "../functions/shared/handler.ts";
import { createInMemoryProtection } from "../functions/shared/protection.ts";
import { ProviderError } from "../functions/shared/provider.ts";
import type { EmotionRuntimeConfig } from "../functions/shared/types.ts";
import { evaluateEmotionResponse, AnalysisSessionTracker } from "../src/lib/ai/client.ts";
import { resolveEmotionEndpoint } from "../src/lib/ai/endpoint.ts";

// 阶段八 S8-03G：Edge Function 与共享 AI 核心的本地回归。
// 使用模拟上游与注入 Provider，不代表真实百炼调用；未发起任何付费请求。

const MODEL = "decision-model-preview";
const TEXT = "今天终于完成作业，有一点累，但很开心。";
const VALID_NATIVE = buildDemoNativeResponse(
  MODEL,
  "joy",
  { valence: 2, arousal: 1, dominance: 2, intensity: 2 },
  0.9,
);

let seq = 0;
function apiBody(patch: Record<string, unknown> = {}): Record<string, unknown> {
  seq += 1;
  return {
    schemaVersion: 1,
    requestId: `req-${seq}`,
    entryId: `entry-${seq}`,
    inputRevision: seq,
    text: TEXT,
    ...patch,
  };
}

function makeConfig(overrides: Partial<EmotionRuntimeConfig> = {}): EmotionRuntimeConfig {
  return {
    enabled: true,
    provider: {
      mode: "bailian",
      apiKey: "test-key",
      baseUrl: "http://127.0.0.1:9",
      modelName: MODEL,
      timeoutMs: 5000,
    },
    maxInputChars: 30000,
    maxBodyBytes: 1024 * 1024,
    ratePerMinute: 1000,
    maxConcurrent: 2,
    callBudget: 100000,
    ...overrides,
  };
}

interface PostOptions {
  provider?: (text: string, config: EmotionRuntimeConfig["provider"]) => Promise<unknown>;
  protection?: ReturnType<typeof createInMemoryProtection>;
  raw?: string;
  method?: string;
  contentType?: string;
}

async function postJson(
  body: unknown,
  config: EmotionRuntimeConfig,
  options: PostOptions = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await handleEmotionRequest(
    new Request("http://localhost/functions/v1/app", {
      method: options.method ?? "POST",
      headers: { "content-type": options.contentType ?? "application/json" },
      body: options.method === "GET" ? undefined : options.raw ?? JSON.stringify(body),
    }),
    {
      config,
      protection: options.protection ?? createInMemoryProtection(),
      provider: options.provider,
      now: () => 0,
      log: () => {},
    },
  );
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

function assertCorrelated(json: Record<string, unknown>, body: Record<string, unknown>) {
  assert.equal(json.requestId, body.requestId);
  assert.equal(json.entryId, body.entryId);
  assert.equal(json.inputRevision, body.inputRevision);
}

async function main() {
  // 1. 正常建议：envelope 与 /api/emotion 完全一致，且必须经用户确认。
  const body = apiBody();
  let result = await postJson(body, makeConfig(), { provider: async () => VALID_NATIVE });
  assert.equal(result.status, 200);
  assert.equal(result.json.ok, true);
  assert.equal(result.json.needsConfirmation, true);
  assertCorrelated(result.json, body);
  assert.deepEqual(result.json.analysis, {
    schemaVersion: 1,
    label: "joy",
    valence: 1,
    arousal: 0.5,
    dominance: 1,
    intensity: 1,
    confidence: 0.9,
  });
  const meta = result.json.analysisMeta as Record<string, unknown>;
  assert.equal(meta.provider, "bailian");
  assert.equal(meta.model, MODEL);

  // 2. 客户端会话校验可接受 Edge envelope；needsConfirmation 不会被绕过。
  const tracker = new AnalysisSessionTracker();
  const session = tracker.begin(body.requestId as string, body.entryId as string, TEXT);
  const outcome = evaluateEmotionResponse(result.json, result.status, session);
  assert.equal(outcome.kind, "success");

  // 3. 严格响应校验：未知字段 / 篡改概率均进入手选降级。
  result = await postJson(apiBody(), makeConfig(), {
    provider: async () => ({ ...VALID_NATIVE, extra: true }),
  });
  assert.equal(result.status, 502);
  assert.equal(result.json.code, "AI_INVALID_OUTPUT");

  const tampered = structuredClone(VALID_NATIVE);
  tampered.answers.valence.score = 1;
  result = await postJson(apiBody(), makeConfig(), { provider: async () => tampered });
  assert.equal(result.status, 502);
  assert.equal(result.json.code, "AI_INVALID_OUTPUT");

  // 4. 失败降级：Provider 错误映射为固定错误码，且不泄露上游细节。
  for (const [kind, status, code] of [
    ["timeout", 504, "AI_TIMEOUT"],
    ["unavailable", 503, "AI_UNAVAILABLE"],
    ["upstream", 502, "AI_UPSTREAM_ERROR"],
    ["input-too-long", 413, "INPUT_TOO_LONG"],
    ["invalid-output", 502, "AI_INVALID_OUTPUT"],
  ] as const) {
    const requestBody = apiBody();
    result = await postJson(requestBody, makeConfig(), {
      provider: async () => {
        throw new ProviderError(kind);
      },
    });
    assert.equal(result.status, status, kind);
    assert.equal(result.json.code, code, kind);
    assertCorrelated(result.json, requestBody);
    assert.equal(JSON.stringify(result.json).includes("test-key"), false);
  }

  // 5. 默认关闭与缺少 Secret：503，且不调用 Provider。
  let providerCalls = 0;
  const countingProvider = async () => {
    providerCalls += 1;
    return VALID_NATIVE;
  };
  result = await postJson(apiBody(), makeConfig({ enabled: false }), { provider: countingProvider });
  assert.equal(result.status, 503);
  assert.equal(result.json.code, "AI_UNAVAILABLE");
  assert.equal(providerCalls, 0, "关闭时不得调用上游");

  const missingKey = makeConfig();
  missingKey.provider.apiKey = null;
  result = await postJson(apiBody(), missingKey, { provider: countingProvider });
  assert.equal(result.status, 503);
  assert.equal(result.json.code, "AI_UNAVAILABLE");
  assert.equal(providerCalls, 0, "缺少 Key 时不得调用上游");

  // 6. 输入限制：请求体与正文字符超限均 413，且不截断正文。
  result = await postJson(apiBody({ text: "长".repeat(200) }), makeConfig({ maxBodyBytes: 80 }), {
    provider: countingProvider,
  });
  assert.equal(result.status, 413);
  assert.equal(result.json.code, "INPUT_TOO_LONG");

  result = await postJson(apiBody({ text: "超过五个字符" }), makeConfig({ maxInputChars: 5 }), {
    provider: countingProvider,
  });
  assert.equal(result.status, 413);
  assert.equal(result.json.code, "INPUT_TOO_LONG");

  // 7. 频率、并发与实例内预算保护。
  const rateProtection = createInMemoryProtection();
  result = await postJson(apiBody(), makeConfig({ ratePerMinute: 1 }), {
    provider: countingProvider,
    protection: rateProtection,
  });
  assert.equal(result.status, 200);
  result = await postJson(apiBody(), makeConfig({ ratePerMinute: 1 }), {
    provider: countingProvider,
    protection: rateProtection,
  });
  assert.equal(result.status, 429);
  assert.equal(result.json.code, "AI_RATE_LIMITED");

  const sharedProtection = createInMemoryProtection();
  result = await postJson(apiBody(), makeConfig({ callBudget: 1 }), {
    provider: countingProvider,
    protection: sharedProtection,
  });
  assert.equal(result.status, 200);
  result = await postJson(apiBody(), makeConfig({ callBudget: 1 }), {
    provider: countingProvider,
    protection: sharedProtection,
  });
  assert.equal(result.status, 503);
  assert.equal(result.json.code, "AI_UNAVAILABLE");

  let releaseFirst: () => void = () => {};
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const concurrencyProtection = createInMemoryProtection();
  const concurrencyConfig = makeConfig({ maxConcurrent: 1 });
  const first = postJson(apiBody(), concurrencyConfig, {
    protection: concurrencyProtection,
    provider: async () => {
      await firstGate;
      return VALID_NATIVE;
    },
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  result = await postJson(apiBody(), concurrencyConfig, {
    protection: concurrencyProtection,
    provider: countingProvider,
  });
  assert.equal(result.status, 429);
  assert.equal(result.json.code, "AI_RATE_LIMITED");
  releaseFirst();
  result = await first;
  assert.equal(result.status, 200);

  // 8. 请求方法与内容类型。
  result = await postJson(apiBody(), makeConfig(), { method: "GET" });
  assert.equal(result.status, 405);
  result = await postJson(apiBody(), makeConfig(), { contentType: "text/plain" });
  assert.equal(result.status, 400);
  assert.equal(result.json.code, "INVALID_INPUT");

  // 9. 超时覆盖读取响应体：模拟上游只发部分响应后停滞。
  let upstreamMode: "stall" | "401" = "stall";
  const server = http.createServer((_request, response) => {
    if (upstreamMode === "401") {
      response.writeHead(401, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: { code: "InvalidApiKey" } }));
      return;
    }
    response.writeHead(200, { "content-type": "application/json" });
    response.write('{"model":"decision-model-preview","answers":');
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const timeoutConfig = makeConfig();
    timeoutConfig.provider.baseUrl = baseUrl;
    timeoutConfig.provider.timeoutMs = 150;
    const startedAt = Date.now();
    result = await postJson(apiBody(), timeoutConfig);
    assert.equal(result.status, 504);
    assert.equal(result.json.code, "AI_TIMEOUT");
    assert.ok(Date.now() - startedAt < 5000, "超时不应等待完整 15 秒");

    upstreamMode = "401";
    const authConfig = makeConfig();
    authConfig.provider.baseUrl = baseUrl;
    result = await postJson(apiBody(), authConfig);
    assert.equal(result.status, 503);
    assert.equal(result.json.code, "AI_UNAVAILABLE");
  } finally {
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  // 10. 静态与常规模式端点选择。
  assert.equal(resolveEmotionEndpoint(true), "/functions/v1/app");
  assert.equal(resolveEmotionEndpoint(false), "/api/emotion");

  // 11. Edge 配置默认关闭；启用后才读取 Key/Workspace 并保留实例内预算默认值。
  const disabled = readEdgeConfig(() => undefined);
  assert.equal(disabled.enabled, false);
  assert.equal(disabled.provider.apiKey, null);
  assert.equal(disabled.maxBodyBytes, 1024 * 1024);

  const env: Record<string, string> = {
    AI_EDGE_ENABLED: "1",
    MODEL_API_KEY: "secret-key",
    BAILIAN_WORKSPACE_ID: "ws-123",
    AI_EDGE_MAX_BODY_BYTES: "999999999",
  };
  const enabled = readEdgeConfig((name) => env[name]);
  assert.equal(enabled.enabled, true);
  assert.equal(enabled.provider.mode, "bailian");
  assert.equal(enabled.provider.apiKey, "secret-key");
  assert.equal(enabled.provider.baseUrl, "https://ws-123.cn-beijing.maas.aliyuncs.com/compatible-mode/v1");
  assert.equal(enabled.maxBodyBytes, 4 * 1024 * 1024, "Edge body 上限会被收紧到 4 MiB");

  // 12. 入口 wiring：用 Deno.serve 桩加载真实 index.ts，确认默认关闭时不触网。
  const captured: { handler: ((request: Request) => Response | Promise<Response>) | null } = { handler: null };
  const envMap: Record<string, string> = {};
  (globalThis as unknown as {
    Deno: { env: { get(name: string): string | undefined }; serve(handler: (request: Request) => Response | Promise<Response>): void };
  }).Deno = {
    env: { get: (name) => envMap[name] },
    serve: (handler) => {
      captured.handler = handler;
    },
  };
  await import("../functions/index.ts");
  const entryHandler = captured.handler;
  assert.ok(entryHandler, "index.ts 必须调用 Deno.serve");
  const entryBody = apiBody();
  const disabledResponse = await entryHandler(
    new Request("http://localhost/functions/v1/app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(entryBody),
    }),
  );
  assert.equal(disabledResponse.status, 503);
  assert.equal(((await disabledResponse.json()) as Record<string, unknown>).code, "AI_UNAVAILABLE");

  envMap.AI_EDGE_ENABLED = "1";
  envMap.MODEL_API_KEY = "secret-key";
  const noWorkspaceResponse = await entryHandler(
    new Request("http://localhost/functions/v1/app", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(apiBody()),
    }),
  );
  assert.equal(noWorkspaceResponse.status, 503);
  assert.equal(((await noWorkspaceResponse.json()) as Record<string, unknown>).code, "AI_UNAVAILABLE");

  console.log("阶段八 Edge AI：校验映射、确认、降级、超时、保护与端点选择验证通过");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
