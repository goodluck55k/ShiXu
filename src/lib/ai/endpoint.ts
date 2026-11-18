const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

// 静态部署没有 Next Route Handler，改由 Qoder Sites Edge Function 提供同一契约；
// 本地/自托管 Next 模式继续使用 /api/emotion。
export function resolveEmotionEndpoint(isStaticExport: boolean): string {
  return isStaticExport ? "/functions/v1/app" : "/api/emotion";
}

export function emotionApiEndpoint(): string {
  return resolveEmotionEndpoint(staticExport);
}
