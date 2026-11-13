import {
  EMOTION_API_ERROR_MESSAGES,
  MAX_OPAQUE_ID_LENGTH,
  MOCK_PROVIDER_NAME,
  type EmotionApiErrorCode,
  type EmotionApiFailure,
  type EmotionApiRequest,
  type EmotionApiSuccess,
} from "@/lib/ai/contract";
import { readAiConfig, MOCK_MODEL_NAME } from "@/lib/ai/server/config";
import { buildAnalysisMeta, mapNativeToAnalysis, validateAnalysisStrict, validateNativeResponse } from "@/lib/ai/server/native";
import { release, tryAcquire } from "@/lib/ai/server/protection";
import { ProviderError, providerErrorCode, requestEmotionNative } from "@/lib/ai/server/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUEST_KEYS = ["schemaVersion", "requestId", "entryId", "inputRevision", "text"];
const STATUS_BY_CODE: Record<EmotionApiErrorCode, number> = {
  INVALID_INPUT: 400,
  INPUT_TOO_LONG: 413,
  AI_UNAVAILABLE: 503,
  AI_UPSTREAM_ERROR: 502,
  AI_RATE_LIMITED: 429,
  AI_TIMEOUT: 504,
  AI_INVALID_OUTPUT: 502,
};

type RequestEcho = Partial<Pick<EmotionApiRequest, "requestId" | "entryId" | "inputRevision">>;

function jsonResponse(status: number, body: EmotionApiSuccess | EmotionApiFailure): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function failure(code: EmotionApiErrorCode, echo: RequestEcho): Response {
  return jsonResponse(STATUS_BY_CODE[code], { ok: false, ...echo, code, message: EMOTION_API_ERROR_MESSAGES[code] });
}

function validOpaqueId(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAX_OPAQUE_ID_LENGTH;
}

async function readBodyLimited(request: Request, maxBytes: number): Promise<string | null> {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel();
      return null;
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return text;
}

function parseRequest(raw: string): { ok: true; req: EmotionApiRequest } | { ok: false; echo: RequestEcho } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, echo: {} };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return { ok: false, echo: {} };
  const record = parsed as Record<string, unknown>;
  const echo: RequestEcho = {};
  if (validOpaqueId(record.requestId)) echo.requestId = record.requestId;
  if (validOpaqueId(record.entryId)) echo.entryId = record.entryId;
  if (typeof record.inputRevision === "number" && Number.isInteger(record.inputRevision) && record.inputRevision >= 0) {
    echo.inputRevision = record.inputRevision;
  }
  if (Object.keys(record).some((key) => !REQUEST_KEYS.includes(key))) return { ok: false, echo };
  if (record.schemaVersion !== 1) return { ok: false, echo };
  if (!validOpaqueId(record.requestId) || !validOpaqueId(record.entryId)) return { ok: false, echo };
  if (typeof record.inputRevision !== "number" || !Number.isInteger(record.inputRevision) || record.inputRevision < 0) {
    return { ok: false, echo };
  }
  if (typeof record.text !== "string" || record.text.trim().length === 0) return { ok: false, echo };
  return {
    ok: true,
    req: {
      schemaVersion: 1,
      requestId: record.requestId,
      entryId: record.entryId,
      inputRevision: record.inputRevision,
      text: record.text,
    },
  };
}

export async function POST(request: Request): Promise<Response> {
  const startedAt = Date.now();
  const config = readAiConfig();
  let logCode = "ok";
  let echo: RequestEcho = {};

  const finish = (response: Response, code: string): Response => {
    logCode = code;
    return response;
  };

  try {
    const contentType = request.headers.get("content-type") ?? "";
    if (!contentType.includes("application/json")) return finish(failure("INVALID_INPUT", {}), "INVALID_INPUT");

    const raw = await readBodyLimited(request, config.maxBodyBytes);
    // 超限时不保留也不解析正文，因此没有可靠三元组可回显；
    // 客户端对当前会话中不带冲突关联字段的失败响应按固定错误码提示。
    if (raw === null) return finish(failure("INPUT_TOO_LONG", {}), "INPUT_TOO_LONG");

    const parsed = parseRequest(raw);
    if (!parsed.ok) return finish(failure("INVALID_INPUT", parsed.echo), "INVALID_INPUT");
    const { req } = parsed;
    echo = { requestId: req.requestId, entryId: req.entryId, inputRevision: req.inputRevision };

    // 保守的发送前输入保护；真实 token 超限由上游明确错误识别（AI_CONTRACT §2.4）
    if (req.text.length > config.maxInputChars) return finish(failure("INPUT_TOO_LONG", echo), "INPUT_TOO_LONG");

    if (config.mode === "bailian" && (!config.apiKey || !config.baseUrl)) {
      return finish(failure("AI_UNAVAILABLE", echo), "AI_UNAVAILABLE");
    }

    const acquired = tryAcquire(config, Date.now());
    if (!acquired.ok) {
      const code: EmotionApiErrorCode = acquired.rejection === "budget" ? "AI_UNAVAILABLE" : "AI_RATE_LIMITED";
      return finish(failure(code, echo), code);
    }

    try {
      const native = await requestEmotionNative(req.text, config);
      const expectedModel = config.mode === "mock" ? MOCK_MODEL_NAME : config.modelName;
      const validated = validateNativeResponse(native, expectedModel);
      if (!validated.ok) return finish(failure("AI_INVALID_OUTPUT", echo), "AI_INVALID_OUTPUT");
      const mapped = validateAnalysisStrict(mapNativeToAnalysis(validated.native));
      if (!mapped.ok) return finish(failure("AI_INVALID_OUTPUT", echo), "AI_INVALID_OUTPUT");
      const analysisMeta = buildAnalysisMeta(
        config.mode === "mock" ? MOCK_PROVIDER_NAME : "bailian",
        expectedModel,
      );
      const body: EmotionApiSuccess = {
        ok: true,
        requestId: req.requestId,
        entryId: req.entryId,
        inputRevision: req.inputRevision,
        analysis: mapped.analysis,
        needsConfirmation: true,
        analysisMeta,
      };
      return finish(jsonResponse(200, body), "ok");
    } catch (error) {
      const code = error instanceof ProviderError ? providerErrorCode(error.kind) : "AI_UPSTREAM_ERROR";
      return finish(failure(code, echo), code);
    } finally {
      release();
    }
  } catch {
    // 读取请求体等意外失败也返回固定错误码，不把异常详情、密钥或正文写回客户端或日志。
    return finish(failure("AI_UPSTREAM_ERROR", echo), "AI_UPSTREAM_ERROR");
  } finally {
    // 只记录结果码与耗时；不打印日记正文、密钥与模型原始内容
    console.info(`[emotion] code=${logCode} durationMs=${Date.now() - startedAt}`);
  }
}