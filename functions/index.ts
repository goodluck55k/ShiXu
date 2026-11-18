import { readEdgeConfig } from "./config.ts";
import { handleEmotionRequest } from "./shared/handler.ts";
import { createInMemoryProtection } from "./shared/protection.ts";

// Qoder Sites 单一 Edge Function 入口，对外路径为 /functions/v1/app。
// 网关会把函数名段替换为上游名称，因此这里不检查具体 pathname。

interface EdgeRuntime {
  Deno: {
    serve(handler: (request: Request) => Response | Promise<Response>): void;
  };
}

const protection = createInMemoryProtection();
const runtime = globalThis as unknown as EdgeRuntime;

runtime.Deno.serve((request) =>
  handleEmotionRequest(request, {
    config: readEdgeConfig(),
    // 实例内计数仅作尽力保护；跨实例可靠预算需平台能力或持久化计数器。
    protection,
  }),
);
