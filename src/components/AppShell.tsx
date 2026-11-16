"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useApp } from "@/application/AppProvider";
import { AppSidebar, ReadingProgressProvider } from "@/components/AppSidebar";
import { StorageRecoveryNotice } from "@/components/StorageRecoveryNotice";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, reload } = useApp();
  const entries = state.snapshot?.entries ?? [];
  return <ReadingProgressProvider>
    <div className={`app-shell${pathname === "/" ? " home-shell" : pathname === "/memories" ? " memories-shell" : pathname === "/wishes" ? " wishes-shell" : ""}`}>
      <AppSidebar pathname={pathname} entries={entries} />
      <main className="main-content"><div className="content-wrap">
        {state.phase === "loading" && <p role="status" className="notice">正在读取本地存档…</p>}
        <StorageRecoveryNotice />
        {state.temporary && <p role="alert" className="notice">临时体验模式：内容仅保存在本次会话中，刷新或关闭后无法保留。</p>}
        {state.tabConflict && <div role="alert" className="notice"><p>检测到另一个标签页修改了存档，提交已暂停。草稿仍在，请重新加载存档后继续。</p><button className="text-button" onClick={() => void reload()}>重新加载存档</button></div>}
        {state.phase === "ready" && state.snapshot && children}
      </div></main>
    </div>
  </ReadingProgressProvider>;
}