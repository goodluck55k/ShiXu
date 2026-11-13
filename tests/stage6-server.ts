import assert from "node:assert/strict";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { POST } from "../src/app/api/emotion/route";
import {
  buildDemoNativeResponse,
  mapNativeToAnalysis,
  validateAnalysisStrict,
  validateNativeResponse,
} from "../src/lib/ai/server/native";

// 阶段六服务端回归：Provider 请求结构、原生响应校验映射、413/429/503/504、
// 超时覆盖响应体读取、密钥不出日志。运行需 react-server 条件以加载 server-only。

const MODEL = "decision-model-preview";
const ENV_KEYS = [
  "AI_PROVIDER_MODE",
  "MODEL_API_KEY",
  "MODEL_BASE_URL",
  "MODEL_NAME",
  "BAILIAN_WORKSPACE_ID",
  "AI_MAX_INPUT_CHARS",
  "AI_MAX_BODY_BYTES",
  "AI_RATE_LIMIT_PER_MINUTE",
  "AI_MAX_CONCURRENT",
  "AI_CALL_BUDGET",
];

function setEnv(values: Record<string, string | undefined>) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) process.env[key] = value;
  }
}

const VALID_NATIVE = buildDemoNativeResponse(
  MODEL,
  "joy",
  { valence: 2, arousal: 1, dominance: 2, intensity: 2 },
  0.9,
);

type UpstreamMode = "valid" | "invalid-json" | "extra-field" | "401" | "413" | "429" | "500" | "stall";
let upstreamMode: UpstreamMode = "valid";
let upstreamDelayMs = 0;
let lastUpstream: { authorization: string | undefined; body: Record<string, unknown> } | null = null;

let requestSeq = 0;
function apiBody(patch: Record<string, unknown> = {}): Record<string, unknown> {
  requestSeq += 1;
  return {
    schemaVersion: 1,
    requestId: `req-${requestSeq}`,
    entryId: `entry-${requestSeq}`,
    inputRevision: requestSeq,
    text: "今天终于完成作业，有一点累，但很开心。",
    ...patch,
  };
}

async function postJson(body: unknown, raw?: string): Promise<{ status: number; json: Record<string, unknown> }> {
  const response = await POST(
    new Request("http://localhost/api/emotion", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: raw ?? JSON.stringify(body),
    }),
  );
  return { status: response.status, json: (await response.json()) as Record<string, unknown> };
}

function assertCorrelated(json: Record<string, unknown>, body: Record<string, unknown>) {
  assert.equal(json.requestId, body.requestId);
  assert.equal(json.entryId, body.entryId);
  assert.equal(json.inputRevision, body.inputRevision);
}

function nativeTests() {
  const valid = validateNativeResponse(VALID_NATIVE, MODEL);
  assert.equal(valid.ok, true);
  if (!valid.ok) return;
  const analysis = mapNativeToAnalysis(valid.native);
  assert.deepEqual(analysis, {
    schemaVersion: 1,
    label: "joy",
    valence: 1,
    arousal: 0.5,
    dominance: 1,
    intensity: 1,
    confidence: 0.9,
  });
  assert.equal(validateAnalysisStrict(analysis).ok, true);

  const rejects: Array<[string, unknown]> = [
    ["未知顶层字段", { ...VALID_NATIVE, extra: true }],
    ["模型不匹配", { ...VALID_NATIVE, model: "other-model" }],
    ["缺少问题", { ...VALID_NATIVE, answers: { ...VALID_NATIVE.answers, intensity: undefined } }],
    ["多出问题", { ...VALID_NATIVE, answers: { ...VALID_NATIVE.answers, extra: VALID_NATIVE.answers.label } }],
    [
      "选项概率键集不一致",
      {
        ...VALID_NATIVE,
        answers: {
          ...VALID_NATIVE.answers,
          label: { ...VALID_NATIVE.answers.label, probabilities: { joy: 1, calm: 0 } },
        },
      },
    ],
    [
      "choice 不是最高概率",
      {
        ...VALID_NATIVE,
        answers: {
          ...VALID_NATIVE.answers,
          label: {
            ...VALID_NATIVE.answers.label,
            choice: "calm",
            probabilities: { ...VALID_NATIVE.answers.label.probabilities, joy: 0.8, calm: 0.2 },
          },
        },
      },
    ],
    [
      "概率和不为 1",
      {
        ...VALID_NATIVE,
        answers: {
          ...VALID_NATIVE.answers,
          valence: { ...VALID_NATIVE.answers.valence, probabilities: { "0": 0.2, "1": 0.2, "2": 0.2 } },
        },
      },
    ],
    [
      "score 与概率加权不一致",
      { ...VALID_NATIVE, answers: { ...VALID_NATIVE.answers, arousal: { ...VALID_NATIVE.answers.arousal, score: 2 } } },
    ],
    [
      "legend 与请求描述不一致",
      { ...VALID_NATIVE, answers: { ...VALID_NATIVE.answers, dominance: { ...VALID_NATIVE.answers.dominance, legend: { "0": "x", "1": "y", "2": "z" } } } },
    ],
    [
      "confidence 越界",
      { ...VALID_NATIVE, answers: { ...VALID_NATIVE.answers, label: { ...VALID_NATIVE.answers.label, confidence: 1.2 } } },
    ],
    [
      "字符串数字",
      { ...VALID_NATIVE, answers: { ...VALID_NATIVE.answers, valence: { ...VALID_NATIVE.answers.valence, score: "2" } } },
    ],
    [
      "未知情绪",
      {
        ...VALID_NATIVE,
        answers: {
          ...VALID_NATIVE.answers,
          label: {
            ...VALID_NATIVE.answers.label,
            choice: "excited",
            probabilities: { ...VALID_NATIVE.answers.label.probabilities, joy: 0, excited: 1 },
          },
        },
      },
    ],
  ];
  for (const [name, value] of rejects) {
    assert.equal(validateNativeResponse(value, MODEL).ok, false, name);
  }
}

async function main() {
  nativeTests();

  const server = http.createServer((request, response) => {
    let body = "";
    request.on("data", (chunk) => {
      body += String(chunk);
    });
    request.on("end", () => {
      try {
        lastUpstream = { authorization: request.headers.authorization, body: JSON.parse(body) as Record<string, unknown> };
      } catch {
        lastUpstream = { authorization: request.headers.authorization, body: {} };
      }
      const send = (status: number, payload: unknown) => {
        response.writeHead(status, { "content-type": "application/json" });
        response.end(typeof payload === "string" ? payload : JSON.stringify(payload));
      };
      if (upstreamMode === "stall") {
        response.writeHead(200, { "content-type": "application/json" });
        response.write('{"model":"decision-model-preview","answers":');
        return;
      }
      const action = () => {
        switch (upstreamMode) {
          case "invalid-json": return send(200, "not-json");
          case "extra-field": return send(200, { ...VALID_NATIVE, extra: true });
          case "401": return send(401, { error: { code: "InvalidApiKey" } });
          case "413": return send(413, { error: { code: "InvalidParameter", message: "input too long" } });
          case "429": return send(429, { error: { code: "Throttling.RateQuota" } });
          case "500": return send(500, { error: { code: "InternalError" } });
          default: return send(200, VALID_NATIVE);
        }
      };
      if (upstreamDelayMs > 0) setTimeout(action, upstreamDelayMs);
      else action();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const configure = (overrides: Record<string, string | undefined> = {}) =>
    setEnv({
      AI_PROVIDER_MODE: "bailian",
      MODEL_API_KEY: "test-key",
      MODEL_BASE_URL: baseUrl,
      MODEL_NAME: MODEL,
      AI_MAX_INPUT_CHARS: "30000",
      AI_MAX_BODY_BYTES: String(32 * 1024 * 1024),
      AI_RATE_LIMIT_PER_MINUTE: "1000",
      AI_MAX_CONCURRENT: "2",
      AI_CALL_BUDGET: "100000",
      ...overrides,
    });

  const logs: string[] = [];
  const originalInfo = console.info;
  console.info = (...args: unknown[]) => {
    logs.push(args.map(String).join(" "));
  };

  try {
    // 1. 非法请求：无效 JSON、未知字段、版本/修订/正文/ID 非法。
    configure();
    let body = apiBody();
    let result = await postJson(body, "not-json");
    assert.equal(result.status, 400);
    assert.equal(result.json.code, "INVALID_INPUT");

    for (const patch of [
      { extra: true },
      { schemaVersion: 2 },
      { inputRevision: -1 },
      { inputRevision: 1.5 },
      { text: "   " },
      { text: 123 },
      { requestId: "" },
      { requestId: "x".repeat(101) },
    ]) {
      body = apiBody(patch);
      result = await postJson(body);
      assert.equal(result.status, 400, JSON.stringify(patch));
      assert.equal(result.json.ok, false);
      assert.equal(result.json.code, "INVALID_INPUT");
    }

    // 2. 未配置 Key：503，且手选路径不受影响（本接口不写存档）。
    configure({ MODEL_API_KEY: undefined });
    body = apiBody();
    result = await postJson(body);
    assert.equal(result.status, 503);
    assert.equal(result.json.code, "AI_UNAVAILABLE");
    assertCorrelated(result.json, body);

    // 3. 请求体字节上限与文本长度上限：413，不截断正文。
    configure({ AI_MAX_BODY_BYTES: "80" });
    body = apiBody({ text: "长".repeat(200) });
    result = await postJson(body);
    assert.equal(result.status, 413);
    assert.equal(result.json.code, "INPUT_TOO_LONG");

    configure({ AI_MAX_INPUT_CHARS: "5" });
    body = apiBody({ text: "超过五个字符" });
    result = await postJson(body);
    assert.equal(result.status, 413);
    assert.equal(result.json.code, "INPUT_TOO_LONG");
    assertCorrelated(result.json, body);

    // 4. mock 仅显式启用；走同一原生校验与映射路径。
    configure({ AI_PROVIDER_MODE: "mock", MODEL_API_KEY: undefined, MODEL_BASE_URL: undefined });
    body = apiBody();
    result = await postJson(body);
    assert.equal(result.status, 200);
    assert.equal(result.json.ok, true);
    assertCorrelated(result.json, body);
    assert.equal((result.json.analysis as Record<string, unknown>).label, "joy");
    assert.equal((result.json.analysisMeta as Record<string, unknown>).provider, "bailian-mock");
    assert.equal(result.json.needsConfirmation, true);

    body = apiBody({ text: "没有命中演示关键词的一段话。" });
    result = await postJson(body);
    assert.equal(result.status, 200);
    assert.equal((result.json.analysis as Record<string, unknown>).label, "mixed");
    assert.equal((result.json.analysis as Record<string, unknown>).confidence, 0.45);

    // 5. 真实 Provider 路径：System One 请求结构与显式映射。
    configure();
    upstreamMode = "valid";
    body = apiBody();
    result = await postJson(body);
    assert.equal(result.status, 200);
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
    assert.equal((result.json.analysisMeta as Record<string, unknown>).provider, "bailian");
    assert.equal((result.json.analysisMeta as Record<string, unknown>).model, MODEL);
    assert.ok(lastUpstream);
    if (lastUpstream) {
      assert.equal(lastUpstream.authorization, "Bearer test-key");
      assert.equal(lastUpstream.body.model, MODEL);
      assert.equal(lastUpstream.body.state, body.text);
      const questions = lastUpstream.body.questions as Record<string, Record<string, unknown>>;
      assert.deepEqual(Object.keys(questions).sort(), ["arousal", "dominance", "intensity", "label", "valence"]);
      assert.equal(questions.label.type, "choice");
      assert.equal(Object.keys(questions.label.criteria as Record<string, string>).length, 9);
      for (const key of ["valence", "arousal", "dominance", "intensity"]) {
        assert.equal(questions[key].type, "score");
        assert.equal((questions[key].criteria as string[]).length, 3);
      }
    }

    // 6. 上游异常与非法输出：全部进入手选降级，不泄露上游内容。
    const upstreamCases: Array<[UpstreamMode, number, string]> = [
      ["invalid-json", 502, "AI_INVALID_OUTPUT"],
      ["extra-field", 502, "AI_INVALID_OUTPUT"],
      ["401", 503, "AI_UNAVAILABLE"],
      ["413", 413, "INPUT_TOO_LONG"],
      ["429", 502, "AI_UPSTREAM_ERROR"],
      ["500", 502, "AI_UPSTREAM_ERROR"],
    ];
    for (const [mode, status, code] of upstreamCases) {
      upstreamMode = mode;
      body = apiBody();
      result = await postJson(body);
      assert.equal(result.status, status, mode);
      assert.equal(result.json.code, code, mode);
      assertCorrelated(result.json, body);
      assert.equal(JSON.stringify(result.json).includes("test-key"), false);
    }
    upstreamMode = "valid";

    // 7. 预算耗尽 503；频率超限 429；并发超限 429。
    configure({ AI_CALL_BUDGET: "1" });
    body = apiBody();
    result = await postJson(body);
    assert.equal(result.status, 503);
    assert.equal(result.json.code, "AI_UNAVAILABLE");

    configure({ AI_RATE_LIMIT_PER_MINUTE: "1" });
    body = apiBody();
    result = await postJson(body);
    assert.equal(result.status, 429);
    assert.equal(result.json.code, "AI_RATE_LIMITED");

    configure({ AI_MAX_CONCURRENT: "1" });
    upstreamDelayMs = 300;
    const first = postJson(apiBody());
    await new Promise((resolve) => setTimeout(resolve, 60));
    const second = postJson(apiBody());
    const [firstResult, secondResult] = await Promise.all([first, second]);
    upstreamDelayMs = 0;
    assert.equal(firstResult.status, 200);
    assert.equal(secondResult.status, 429);
    assert.equal(secondResult.json.code, "AI_RATE_LIMITED");

    // 8. 15 秒超时覆盖读取响应体：上游只发响应头后停滞，仍返回 504。
    configure({ AI_MAX_CONCURRENT: "2" });
    upstreamMode = "stall";
    body = apiBody();
    const startedAt = Date.now();
    result = await postJson(body);
    const elapsed = Date.now() - startedAt;
    assert.equal(result.status, 504);
    assert.equal(result.json.code, "AI_TIMEOUT");
    assertCorrelated(result.json, body);
    assert.ok(elapsed >= 14000, `超时应接近 15 秒，实际 ${elapsed}ms`);

    // 9. 日志只含结果码与耗时：不含 Key、正文或原生响应。
    const joined = logs.join("\n");
    assert.ok(logs.length > 0);
    assert.equal(joined.includes("test-key"), false);
    assert.equal(joined.includes("今天终于完成作业"), false);
    assert.equal(joined.includes("decision-model-preview"), false);
    assert.ok(logs.every((line) => /^\[emotion\] code=\S+ durationMs=\d+$/.test(line)));
  } finally {
    console.info = originalInfo;
    upstreamMode = "valid";
    server.closeAllConnections?.();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }

  console.log("阶段六服务端 Provider、校验映射、错误码、超时与保护验证通过");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
