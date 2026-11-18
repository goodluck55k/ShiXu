const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

// Qoder Sites 静态托管只按精确文件键响应，不存在无扩展名到 .html 的映射。
export function appHref(route: string): string {
  return staticExport && route !== "/" ? `${route}.html` : route;
}

// 只有静态导出下的子页面必须整页跳到真实文件；根路径与常规 Next.js 仍走客户端导航。
export function requiresFullPageNavigation(route: string): boolean {
  return staticExport && route !== "/";
}

export function normalizeAppPath(pathname: string): string {
  const clean = pathname.replace(/\.html$/, "");
  return clean === "" ? "/" : clean;
}
