"use client";
import { useApp } from "@/application/AppProvider";
import { useBehaviorRuntime } from "@/application/useBehaviorRuntime";
import { BEHAVIOR_V2 } from "@/config/behavior";
import type { BehaviorCategory } from "@/domain/behavior";
import { deriveCharacterView } from "@/domain/characterView";
import { derivePersonality } from "@/domain/personality";
import { EMOTION_NAMES } from "@/domain/types";
import { CharacterRenderer } from "./CharacterRenderer";
import { OfflineLifePanel } from "./OfflineLifePanel";

const CATEGORY_NAMES: Record<BehaviorCategory, string> = {
  ambient: "普通待机",
  dominant: "主导行为",
  special: "特殊行为",
  interaction: "互动回应",
};

function Landscape() { return <svg className="landscape" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
 <defs><linearGradient id="sky" x2="0" y2="1"><stop stopColor="#d8eaf0"/><stop offset="1" stopColor="#f5f2d8"/></linearGradient><linearGradient id="grass" x2="0" y2="1"><stop stopColor="#dce7b1"/><stop offset="1" stopColor="#aabe86"/></linearGradient><radialGradient id="sun"><stop stopColor="#fff9d6" stopOpacity=".9"/><stop offset="1" stopColor="#fff9d6" stopOpacity="0"/></radialGradient></defs>
 <rect width="1200" height="700" fill="url(#sky)"/><circle cx="930" cy="120" r="190" fill="url(#sun)"/><g fill="#fffaf0" opacity=".8"><path d="M795 174q18-25 46-15 16-43 52-29 17-27 43-12 19 8 22 31 27-3 42 25z"/><path d="M321 215q13-21 35-15 11-30 38-22 15-20 36-7 12 8 13 25 23-3 34 19z"/></g>
 <path d="M0 379 Q110 299 210 370 Q310 292 416 370 Q520 304 625 377 Q742 290 849 366 Q980 280 1100 358 L1200 332V700H0Z" fill="#c3d5ba"/><path d="M0 430 Q180 330 360 413 T720 399 T1200 398 V700H0Z" fill="#d5e3b9"/><path d="M0 471 Q270 376 545 437 T1200 425 V700H0Z" fill="url(#grass)"/><path d="M0 590 Q250 490 510 570 T1200 532 V700H0Z" fill="#b5cb8d" opacity=".55"/><path d="M350 700 Q560 580 850 700" fill="#e3eab8" opacity=".35"/>
 <g fill="#a9c48f" opacity=".85"><ellipse cx="1090" cy="391" rx="120" ry="74"/><ellipse cx="1170" cy="343" rx="100" ry="98"/><ellipse cx="93" cy="420" rx="115" ry="65"/></g>
 <g><path d="M100 468 Q142 330 133 202 Q130 147 83 82 L121 69 Q185 148 173 235 Q199 185 260 147 L273 165 Q200 226 183 317 Q181 397 203 448Z" fill="#ad9875"/><path d="M153 385 Q161 287 154 208" fill="none" stroke="#c7b18a" strokeWidth="9" strokeLinecap="round" opacity=".7"/><g fill="#a9c18d"><ellipse cx="95" cy="89" rx="135" ry="76"/><ellipse cx="216" cy="77" rx="128" ry="72"/><ellipse cx="303" cy="120" rx="99" ry="57"/></g><g fill="#c5d4a0"><ellipse cx="33" cy="51" rx="93" ry="55"/><ellipse cx="165" cy="42" rx="98" ry="56"/><ellipse cx="266" cy="65" rx="93" ry="50"/><ellipse cx="350" cy="110" rx="68" ry="40"/></g></g>
 <g fill="#f6f0d6" opacity=".8"><ellipse cx="707" cy="510" rx="50" ry="5"/><ellipse cx="410" cy="550" rx="38" ry="4"/><ellipse cx="899" cy="475" rx="31" ry="3"/></g>
 </svg>; }
function Foreground() { return <svg className="foreground" viewBox="0 0 1200 700" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><g fill="none" stroke="#809f73" strokeWidth="4" strokeLinecap="round"><path d="M76 700 Q90 616 50 565 M94 700 Q115 608 145 583 M1114 700 Q1096 615 1146 562 M1080 700 Q1065 635 1030 610"/></g><g fill="#9dbb86"><ellipse cx="55" cy="596" rx="13" ry="30" transform="rotate(-40 55 596)"/><ellipse cx="130" cy="610" rx="13" ry="30" transform="rotate(43 130 610)"/><ellipse cx="1131" cy="594" rx="14" ry="31" transform="rotate(40 1131 594)"/><ellipse cx="1043" cy="637" rx="12" ry="28" transform="rotate(-42 1043 637)"/></g><g fill="#fffaf0"><circle cx="208" cy="573" r="8"/><circle cx="219" cy="573" r="8"/><circle cx="214" cy="563" r="8"/><circle cx="214" cy="582" r="8"/><circle cx="1000" cy="550" r="7"/><circle cx="1010" cy="550" r="7"/><circle cx="1005" cy="540" r="7"/><circle cx="1005" cy="559" r="7"/></g><g fill="#edca75"><circle cx="214" cy="573" r="5"/><circle cx="1005" cy="550" r="4"/></g></svg>; }
export function CompanionScreen() {
  const { state } = useApp();
  const { decision, view, paused, interact } = useBehaviorRuntime();
  const snapshot = state.snapshot;
  if (!snapshot) return null;
  const emotion = snapshot.character.currentEmotion;
  const personality = derivePersonality(snapshot.personality);
  const behaviorLabel = decision ? BEHAVIOR_V2.behaviors.find((b) => b.id === decision.behaviorId)?.label ?? decision.behaviorId : null;
  const statusText = !decision
    ? "临时动作 · 准备中"
    : decision.reasonCode === "save_feedback"
      ? "临时反馈 · 回应刚保存的心情"
      : `临时动作 · ${behaviorLabel}（${CATEGORY_NAMES[decision.category]}）`;
  return <div className="page companion-page"><header className="page-header companion-header"><div><p className="eyebrow">YOUR QUIET COMPANION</p><h1>我的小人<span className="title-dot">.</span></h1><p>一个陪伴你记录心情的小伙伴。</p></div><span className="local-badge">◉ &nbsp;{state.temporary ? "临时体验" : "本地保存"}</span></header><section className="scene" aria-label="小人的自然活动空间"><Landscape/><div className={paused ? "scene-character is-paused" : "scene-character"}><CharacterRenderer view={view ?? deriveCharacterView(snapshot)} /></div><Foreground/><div className="scene-status"><span className="status-heart" aria-hidden="true">♡</span><div><p>此刻的心情 {emotion && <span className={`mood-pill emotion-${emotion.label}`}>{EMOTION_NAMES[emotion.label]}</span>}</p><small>{emotion ? "每一种心情，都有它的位置。" : "从第一篇日记开始，慢慢认识彼此。"}</small></div><span className="status-sprig" aria-hidden="true">♧</span></div></section><div className="behavior-controls" aria-label="临时互动控件"><button type="button" onClick={() => interact("call")}>呼唤小人</button><button type="button" onClick={() => interact("pat")}>摸摸头</button><button type="button" onClick={() => interact("observe")}>凑近看看</button><span className="behavior-status" aria-live="polite">{statusText}</span></div><section className="companion-profile" aria-label="小人资料"><div className="section-heading"><div><span className="section-kicker">QUIET GROWTH</span><h2>小人最近的样子</h2></div><span aria-hidden="true">✾</span></div><ul className="profile-list"><li>{personality.dominantDescription}</li></ul><p className="profile-note">这是小人自己的行为倾向，在你记录的心情里慢慢长大。</p></section><OfflineLifePanel snapshot={snapshot} /><p className="page-footnote">在这里，慢慢来就好。</p></div>;
}
