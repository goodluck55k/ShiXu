"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useApp } from "@/application/AppProvider";
import { StorageRecoveryNotice } from "@/components/StorageRecoveryNotice";

const links = [ { href: "/", label: "写下今天", icon: "✎" }, { href: "/companion", label: "我的小人", icon: "♧" }, { href: "/memories", label: "回忆碎片", icon: "▤" } ];
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, reload } = useApp();
  return <div className="app-shell">
    <aside className="sidebar"><Link className="brand" href="/"><span className="brand-mark">♧</span><span>拾绪 <small>ShiXu</small></span></Link><p className="brand-caption">把日子轻轻收好</p>
      <nav aria-label="主导航" className="nav-list">{links.map(link => <Link key={link.href} href={link.href} aria-current={pathname === link.href ? "page" : undefined} className={pathname === link.href ? "nav-link active" : "nav-link"}><span className="nav-icon" aria-hidden="true">{link.icon}</span><span>{link.label}</span></Link>)}</nav>
      <div className="sidebar-note"><span>✳</span><p>每一种心情<br />都值得被珍藏。</p></div>
    </aside>
    <main className="main-content"><div className="content-wrap">
      {state.phase === "loading" && <p role="status" className="notice">正在读取本地存档…</p>}
      <StorageRecoveryNotice />
      {state.temporary && <p role="alert" className="notice">临时体验模式：内容仅保存在本次会话中，刷新或关闭后无法保留。</p>}
      {state.tabConflict && <div role="alert" className="notice"><p>检测到另一个标签页修改了存档，提交已暂停。草稿仍在，请重新加载存档后继续。</p><button className="text-button" onClick={() => void reload()}>重新加载存档</button></div>}
      {state.phase === "ready" && state.snapshot && children}
    </div></main>
  </div>;
}
