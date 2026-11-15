"use client";
import { useApp } from "@/application/AppProvider";
import { useBehaviorRuntime } from "@/application/useBehaviorRuntime";
import { BEHAVIOR_V2 } from "@/config/behavior";
import { deriveCharacterView } from "@/domain/characterView";
import { derivePersonality } from "@/domain/personality";
import { RoomScene } from "./RoomScene";
import { OfflineLifePanel } from "./OfflineLifePanel";
import { ReunionPanel } from "./ReunionPanel";

export function CompanionScreen() {
 const { state } = useApp();
 const { decision, view, paused, interact, feedbackActive } = useBehaviorRuntime();
 const snapshot = state.snapshot;
 if (!snapshot) return null;
 const personality = derivePersonality(snapshot.personality);
 const behaviorLabel = decision ? BEHAVIOR_V2.behaviors.find(b => b.id === decision.behaviorId)?.label : null;
 const showHearts = feedbackActive && state.lastConfirmedSave?.emotion.label === "joy" && !paused;
 return <div className="page companion-page"><header className="page-header home-header"><div><p className="eyebrow">A LITTLE HOME FOR SHIXU</p><h1>企鹅小屋<span className="title-dot">.</span></h1><p>在这里，和拾绪一起慢慢生活。</p></div></header>
 <section className="room-layout" aria-label="企鹅的生活空间"><RoomScene decision={decision} view={view ?? deriveCharacterView(snapshot)} paused={paused} feedbackActive={feedbackActive} showHearts={!!showHearts} reunionPending={!!snapshot.reunion.pending} />
 <div className="home-side"><section className="home-status"><span className="section-kicker">A QUIET MOMENT</span><h2>🌱 今天的企鹅</h2><p>正在{behaviorLabel ?? "安静地待着"}</p><p>{personality.dominantDescription}</p></section><div className="behavior-controls" aria-label="与企鹅互动"><button type="button" onClick={() => interact("call")}>☼<br/>呼唤</button><button type="button" onClick={() => interact("pat")}>✋<br/>摸摸头</button><button type="button" onClick={() => interact("observe")}>⌕<br/>凑近看看</button></div><span className="behavior-status" aria-live="polite">{feedbackActive ? "企鹅回应了刚才的心情" : behaviorLabel}</span></div></section>
 <ReunionPanel/><OfflineLifePanel snapshot={snapshot}/></div>;
}
