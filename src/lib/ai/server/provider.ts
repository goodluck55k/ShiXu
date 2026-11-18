import "server-only";

// 厂商适配器的 Node 服务端边界：共享实现不依赖 server-only，浏览器只能经 Route Handler 调用。
export { ProviderError, providerErrorCode, requestEmotionNative } from "@edge/shared/provider";
export type { ProviderErrorKind } from "@edge/shared/provider";
