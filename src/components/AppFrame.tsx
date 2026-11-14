"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AppProvider } from "@/application/AppProvider";
import { AppShell } from "./AppShell";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  // 开发预览完全隔离正式存档及会话 checkpoint。
  if (process.env.NODE_ENV === "development" && pathname === "/character-preview") return children;
  return <AppProvider><AppShell>{children}</AppShell></AppProvider>;
}
