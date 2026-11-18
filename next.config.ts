import type { NextConfig } from "next";

const staticExport = process.env.NEXT_STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Qoder Sites 只托管静态产物；/api 路由与动态预览页不能进入静态导出。
  ...(staticExport ? { output: "export" as const, pageExtensions: ["tsx", "jsx", "js"] } : {}),
};

export default nextConfig;
