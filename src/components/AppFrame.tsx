"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppProvider } from "@/application/AppProvider";
import { normalizeAppPath } from "@/lib/appPaths";
import { AppShell } from "./AppShell";

export function AppFrame({ children }: { children: ReactNode }) {
  const routePath = normalizeAppPath(usePathname());
  // 开发预览完全隔离正式存档及会话 checkpoint；动作演示馆只使用页面内存，同样不接入正式存档。
  if (process.env.NODE_ENV === "development" && routePath === "/character-preview") return children;
  if (routePath === "/penguin-demo") return children;
  return <AppProvider><AppShell>{children}</AppShell></AppProvider>;
}
