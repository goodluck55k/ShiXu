"use client";
import { useApp } from "@/application/AppProvider";
import { DiaryHistory } from "@/components/memories/DiaryHistory";
export default function Page() { const { state } = useApp(); return <div className="page memories-page"><header className="page-header"><div><p className="eyebrow">LITTLE MOMENTS, KEPT CLOSE</p><h1>回忆碎片<span className="title-dot">.</span></h1><p>那些被好好记录下来的心情。</p></div><span className="header-sprig" aria-hidden="true">❧</span></header><DiaryHistory entries={state.snapshot?.entries ?? []} /></div>; }
