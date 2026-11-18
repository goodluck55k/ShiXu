"use client";
import { useApp } from "@/application/AppProvider";
import { DiaryHistory } from "@/components/memories/DiaryHistory";

function CornerBranch() {
  return <svg className="memories-corner-sprig" viewBox="0 0 230 130" aria-hidden="true">
    <path d="M228 6C186 11 148 25 118 51C96 70 82 88 56 100" fill="none" stroke="#8b984e" strokeWidth="2.3" strokeLinecap="round"/>
    <path d="M156 32C168 20 186 16 205 20" fill="none" stroke="#8b984e" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M120 50C120 34 130 21 147 15" fill="none" stroke="#8b984e" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M96 72C86 58 86 42 96 28" fill="none" stroke="#8b984e" strokeWidth="1.7" strokeLinecap="round"/>
    <path d="M74 90C60 84 50 72 48 57" fill="none" stroke="#8b984e" strokeWidth="1.5" strokeLinecap="round"/>
    <g fill="#9fae5e" stroke="#7f8d45" strokeWidth="1" strokeLinejoin="round">
      <path d="M176 24C189 13 207 13 219 22 208 34 189 35 176 24Z"/>
      <path d="M150 32C143 18 150 5 164 0 170 14 164 27 150 32Z"/>
      <path d="M129 47C117 39 113 24 121 11 134 18 138 33 129 47Z"/>
      <path d="M116 54C128 42 145 41 158 51 147 64 130 65 116 54Z"/>
      <path d="M101 68C94 55 99 40 112 33 119 46 113 61 101 68Z"/>
      <path d="M92 77C79 73 70 61 71 46 85 50 94 62 92 77Z"/>
      <path d="M79 88C88 76 104 73 117 80 108 93 92 96 79 88Z"/>
      <path d="M66 97C55 90 51 76 57 63 70 69 75 83 66 97Z"/>
      <path d="M53 102C40 101 30 90 30 75 44 78 54 89 53 102Z"/>
      <path d="M109 96C116 103 127 104 137 100 130 91 118 89 109 96Z"/>
    </g>
  </svg>;
}

export default function Page() {
  const { state } = useApp();
  return <div className="page memories-page">
    <div className="mobile-memory-brand" aria-hidden="true">♧ <b>拾绪 <small>ShiXu</small></b></div>
    <header className="page-header">
      <CornerBranch />
      <div>
        <p className="eyebrow">LITTLE MOMENTS, KEPT CLOSE</p>
        <h1>回忆碎片<span className="title-dot">.</span></h1>
        <p>那些被好好记录下来的心情，像一本慢慢写满的手账。</p>
      </div>
      <span className="header-sprig" aria-hidden="true">❧</span>
    </header>
    <DiaryHistory entries={state.snapshot?.entries ?? []} />
  </div>;
}
