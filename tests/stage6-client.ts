import assert from "node:assert/strict";
import {
  AnalysisSessionTracker,
  errorFromHttpStatus,
  evaluateEmotionResponse,
  toAnalysis,
  toAnalysisMeta,
  type AnalysisSession,
} from "../src/lib/ai/client";
import { EMOTION_API_ERROR_MESSAGES } from "../src/lib/ai/contract";

const session: AnalysisSession = {
  requestId: "req-1",
  entryId: "entry-1",
  inputRevision: 3,
  text: "今天终于完成作业，有一点累，但很开心。",
};

const ANALYSIS = {
  schemaVersion: 1,
  label: "joy",
  valence: 1,
  arousal: 0.5,
  dominance: 1,
  intensity: 1,
  confidence: 0.9,
};

const META = {
  provider: "bailian",
  model: "decision-model-preview",
  mappingVersion: "bailian-emotion-v1",
  dimensionSources: {
    label: "choice",
    valence: "score",
    arousal: "score",
    dominance: "score",
    intensity: "score",
    confidence: "min-answer-confidence",
  },
};

function success(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ok: true,
    requestId: session.requestId,
    entryId: session.entryId,
    inputRevision: session.inputRevision,
    analysis: ANALYSIS,
    needsConfirmation: true,
    analysisMeta: META,
    ...patch,
  };
}

function failure(patch: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    ok: false,
    requestId: session.requestId,
    entryId: session.entryId,
    inputRevision: session.inputRevision,
    code: "AI_TIMEOUT",
    message: "服务端文案不应直接信任",
    ...patch,
  };
}

function main() {
  // 1. 合法成功响应：只按字段白名单构造规范化建议。
  const ok = evaluateEmotionResponse(success(), 200, session);
  assert.equal(ok.kind, "success");
  if (ok.kind === "success") {
    assert.deepEqual(ok.suggestion.analysis, ANALYSIS);
    assert.deepEqual(ok.suggestion.analysisMeta, META);
    assert.notEqual(ok.suggestion.analysis, ANALYSIS, "应构造新对象，不直接展开响应");
  }

  // 2. ok:true 但 HTTP 非 2xx 的响应不是成功，按状态映射固定错误，不能进入建议。
  for (const [status, code] of [
    [413, "INPUT_TOO_LONG"],
    [429, "AI_RATE_LIMITED"],
    [502, "AI_UPSTREAM_ERROR"],
    [503, "AI_UNAVAILABLE"],
    [504, "AI_TIMEOUT"],
  ] as Array<[number, string]>) {
    const outcome = evaluateEmotionResponse(success(), status, session);
    assert.equal(outcome.kind, "error", `HTTP ${status}`);
    if (outcome.kind === "error") assert.equal(outcome.error.code, code, `HTTP ${status}`);
  }
  assert.equal(evaluateEmotionResponse(success(), 201, session).kind, "success");

  // 3. 三元组任一不匹配：成功与失败响应都必须丢弃。
  for (const patch of [
    { requestId: "req-old" },
    { entryId: "entry-old" },
    { inputRevision: 2 },
    { inputRevision: "3" },
  ]) {
    assert.equal(evaluateEmotionResponse(success(patch), 200, session).kind, "ignore");
    assert.equal(evaluateEmotionResponse(failure(patch), 504, session).kind, "ignore");
  }
  // 解析前失败（如请求体超限）没有可靠三元组可回显；当前会话仍有效时按固定错误码提示。
  const bodyTooLong = evaluateEmotionResponse(
    { ok: false, code: "INPUT_TOO_LONG", message: "服务端文案不应直接信任" },
    413,
    session,
  );
  assert.equal(bodyTooLong.kind, "error");
  if (bodyTooLong.kind === "error") {
    assert.equal(bodyTooLong.error.code, "INPUT_TOO_LONG");
    assert.equal(bodyTooLong.error.message, EMOTION_API_ERROR_MESSAGES.INPUT_TOO_LONG);
  }
  // 无关联字段且无合法 code 时按 HTTP 状态映射，不静默忽略。
  const noEchoNoCode = evaluateEmotionResponse({ ok: false }, 413, session);
  assert.equal(noEchoNoCode.kind, "error");
  if (noEchoNoCode.kind === "error") assert.equal(noEchoNoCode.error.code, "INPUT_TOO_LONG");
  // 只要带出的关联字段与当前会话冲突，仍视为旧响应丢弃。
  assert.equal(
    evaluateEmotionResponse({ ok: false, requestId: "req-old", code: "INPUT_TOO_LONG" }, 413, session).kind,
    "ignore",
  );

  // 4. 匹配的失败响应使用固定契约文案，不采用服务端 message 原文。
  const timeout = evaluateEmotionResponse(failure(), 504, session);
  assert.equal(timeout.kind, "error");
  if (timeout.kind === "error") {
    assert.equal(timeout.error.code, "AI_TIMEOUT");
    assert.equal(timeout.error.message, EMOTION_API_ERROR_MESSAGES.AI_TIMEOUT);
  }
  const unknownCode = evaluateEmotionResponse(failure({ code: "SOMETHING_NEW" }), 504, session);
  assert.equal(unknownCode.kind, "error");
  if (unknownCode.kind === "error") assert.equal(unknownCode.error.code, "AI_UPSTREAM_ERROR");

  // 5. 非 envelope / 非法 JSON：按当前 HTTP 状态映射，仍可提示手选。
  const statusCases: Array<[number, string]> = [
    [400, "INVALID_INPUT"],
    [413, "INPUT_TOO_LONG"],
    [429, "AI_RATE_LIMITED"],
    [502, "AI_UPSTREAM_ERROR"],
    [503, "AI_UNAVAILABLE"],
    [504, "AI_TIMEOUT"],
    [500, "AI_UPSTREAM_ERROR"],
  ];
  for (const [status, code] of statusCases) {
    const outcome = evaluateEmotionResponse(null, status, session);
    assert.equal(outcome.kind, "error");
    if (outcome.kind === "error") assert.equal(outcome.error.code, code, `HTTP ${status}`);
    assert.equal(errorFromHttpStatus(status).code, code);
  }

  // 6. 成功 envelope 的非法字段集合、非法数值与非法元信息不能进入正式保存。
  const invalidAnalyses: unknown[] = [
    { ...ANALYSIS, extra: 1 },
    { ...ANALYSIS, schemaVersion: 2 },
    { ...ANALYSIS, label: "excited" },
    { ...ANALYSIS, valence: "1" },
    { ...ANALYSIS, valence: 1.2 },
    { ...ANALYSIS, confidence: Number.NaN },
    { ...ANALYSIS, arousal: null },
  ];
  for (const analysis of invalidAnalyses) {
    const outcome = evaluateEmotionResponse(success({ analysis }), 200, session);
    assert.equal(outcome.kind, "error");
    if (outcome.kind === "error") assert.equal(outcome.error.code, "AI_INVALID_OUTPUT");
  }
  const invalidMetas: unknown[] = [
    { ...META, extra: 1 },
    { ...META, provider: "" },
    { ...META, dimensionSources: { ...META.dimensionSources, extra: "x" } },
    { ...META, dimensionSources: { ...META.dimensionSources, label: 1 } },
    { ...META, dimensionSources: undefined },
  ];
  for (const analysisMeta of invalidMetas) {
    const outcome = evaluateEmotionResponse(success({ analysisMeta }), 200, session);
    assert.equal(outcome.kind, "error");
    if (outcome.kind === "error") assert.equal(outcome.error.code, "AI_INVALID_OUTPUT");
  }
  assert.equal(toAnalysis({ ...ANALYSIS, extra: 1 }), null);
  assert.equal(toAnalysisMeta({ ...META, extra: 1 }), null);
  assert.deepEqual(toAnalysisMeta(META), META);

  // 7. needsConfirmation 必须为 true；建议不能是自动保存指令。
  const noConfirm = evaluateEmotionResponse(success({ needsConfirmation: false }), 200, session);
  assert.equal(noConfirm.kind, "error");
  if (noConfirm.kind === "error") assert.equal(noConfirm.error.code, "AI_INVALID_OUTPUT");

  // 8. 低置信度与 unknown 仍是可展示、需用户确认的建议；客户端不转 neutral。
  const low = evaluateEmotionResponse(success({ analysis: { ...ANALYSIS, confidence: 0.59 } }), 200, session);
  assert.equal(low.kind, "success");
  if (low.kind === "success") assert.equal(low.suggestion.analysis.confidence, 0.59);
  const unknown = evaluateEmotionResponse(
    success({ analysis: { ...ANALYSIS, label: "unknown", confidence: 0.2 } }),
    200,
    session,
  );
  assert.equal(unknown.kind, "success");
  if (unknown.kind === "success") {
    assert.equal(unknown.suggestion.analysis.label, "unknown");
    assert.notEqual(unknown.suggestion.analysis.label, "neutral");
  }

  // 9. 旧会话失效：新请求、正文编辑、手选/保存/取消后旧响应不能命中。
  const tracker = new AnalysisSessionTracker();
  const first = tracker.begin("req-a", "entry-a", "第一版正文");
  assert.equal(tracker.isActive(first), true);
  const second = tracker.begin("req-b", "entry-b", "第二版正文");
  assert.equal(tracker.isActive(first), false);
  assert.equal(tracker.isActive(second), true);
  assert.ok(second.inputRevision > first.inputRevision);
  tracker.invalidate();
  assert.equal(tracker.isActive(second), false);
  const third = tracker.begin("req-c", "entry-c", "第三版正文");
  assert.ok(third.inputRevision > second.inputRevision);
  assert.equal(tracker.isActive(third), true);
  // 旧成功/失败 envelope 即使三元组自洽，也不得作为当前会话建议。
  assert.equal(tracker.isActive(first), false);
  assert.equal(tracker.isActive(second), false);

  // 10. 手选后保留的旧建议仍绑定原请求正文；正文变化必须重新识别。
  assert.notEqual(first.text, third.text);

  console.log("阶段六客户端会话、三元组、严格字段与错误映射验证通过");
}

main();
