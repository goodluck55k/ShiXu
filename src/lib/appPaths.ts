const staticExport = process.env.NEXT_PUBLIC_STATIC_EXPORT === "1";

// Qoder Sites 静态托管只按精确文件键响应，不存在无扩展名到 .html 的映射。
export function appHref(route: string): string {
  return staticExport && route !== "/" ? `${route}.html` : route;
}

export function normalizeAppPath(pathname: string): string {
  const clean = pathname.replace(/\.html$/, "");
  return clean === "" ? "/" : clean;
}
