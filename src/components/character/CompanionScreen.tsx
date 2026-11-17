"use client";
import { useApp } from "@/application/AppProvider";
import { useBehaviorRuntime } from "@/application/useBehaviorRuntime";
import { BEHAVIOR_V2 } from "@/config/behavior";
import { deriveCharacterView } from "@/domain/characterView";
import { derivePersonality } from "@/domain/personality";
import { RoomScene } from "./RoomScene";
import { OfflineLifePanel } from "./OfflineLifePanel";
import { ReunionPanel } from "./ReunionPanel";
import { PenguinFront } from "./PenguinFront";

type Interaction = "call" | "pat" | "observe";
const INTERACTIONS: { id: Interaction; label: string }[] = [
  { id: "call", label: "呼唤" }, { id: "pat", label: "摸摸头" }, { id: "observe", label: "凑近看看" },
];

export function CompanionScreen() {
 const { state } = useApp();
 const { decision, view, paused, interact, feedbackActive } = useBehaviorRuntime();
 const snapshot = state.snapshot;
 if (!snapshot) return null;
 const personality = derivePersonality(snapshot.personality);
 const behavior = decision ? BEHAVIOR_V2.behaviors.find(b => b.id === decision.behaviorId) : undefined;
 const behaviorLabel = behavior?.label ?? null;
 const responding = behavior?.category === "interaction" ? behavior.interactionType : undefined;
 const currentView = view ?? deriveCharacterView(snapshot);
 const showHearts = feedbackActive && state.lastConfirmedSave?.emotion.label === "joy" && !paused;
 return <div className="page companion-page">
  <section className="room-layout" aria-label="企鹅的生活空间">
   <RoomScene decision={decision} view={currentView} paused={paused} feedbackActive={feedbackActive} showHearts={!!showHearts} reunionPending={!!snapshot.reunion.pending} />
   <div className="home-side">
    <section className="home-status" aria-labelledby="home-status-title">
     <span className="home-status-tape" aria-hidden="true" />
     <div className="home-status-head">
      <div>
       <span className="section-kicker">A QUIET MOMENT</span>
       <h2 id="home-status-title"><SproutMark />今天的企鹅</h2>
      </div>
      <span className="home-status-avatar" aria-hidden="true"><PenguinFront size={64} expression={currentView.expression} /></span>
     </div>
     <p className="home-status-state"><span>正在</span><b className="state-pill">{behaviorLabel ?? "安静地待着"}</b></p>
     <p className="home-status-desc">{personality.dominantDescription}</p>
    </section>
    <div className="behavior-controls" role="group" aria-label="与企鹅互动">
     {INTERACTIONS.map(item => <button key={item.id} type="button" className={responding === item.id ? "is-responding" : undefined} onClick={() => interact(item.id)}>
      <InteractionIcon id={item.id} /><span>{item.label}</span>
     </button>)}
    </div>
    <span className={`behavior-status${feedbackActive ? " is-feedback" : ""}`} aria-live="polite">{feedbackActive ? "企鹅回应了刚才的心情" : behaviorLabel}</span>
    <div className="home-notes"><ReunionPanel /><OfflineLifePanel snapshot={snapshot} /></div>
   </div>
  </section>
 </div>;
}

function SproutMark() {
 return <svg className="sprout-mark" viewBox="0 0 24 24" aria-hidden="true">
  <path d="M12 21 V11" />
  <path d="M12 12 C12 7 8.5 5 4 5.5 C4.2 10 7.4 12.4 12 12 Z" className="leaf" />
  <path d="M12 10 C12.4 6 15.6 3.6 20 4 C19.6 8.6 16.4 10.6 12 10 Z" className="leaf" />
 </svg>;
}

function InteractionIcon({ id }: { id: Interaction }) {
 return <svg className="interaction-icon" viewBox="0 0 32 32" aria-hidden="true">
  {id === "call" && <>
   <path className="fill" d="M6 13.5 h4.5 l7 -5.5 v16 l-7 -5.5 H6 a1.5 1.5 0 0 1 -1.5 -1.5 v-2 a1.5 1.5 0 0 1 1.5 -1.5 Z" />
   <path d="M22 12.5 c1.6 1.8 1.6 5.2 0 7 M25.5 9.5 c3.2 3.6 3.2 9.4 0 13" />
  </>}
  {id === "pat" && <path className="fill" d="M11 17 V8.5 a1.8 1.8 0 0 1 3.6 0 V15 V6.5 a1.8 1.8 0 0 1 3.6 0 V15 V7.8 a1.8 1.8 0 0 1 3.6 0 V16 V11 a1.8 1.8 0 0 1 3.6 0 v8 c0 5 -3.4 8.5 -8.2 8.5 c-3 0 -5 -1.3 -6.6 -3.6 l-3.8 -5.6 a1.9 1.9 0 0 1 3 -2.3 Z" />}
  {id === "observe" && <>
   <circle className="fill" cx="14" cy="14" r="7.5" />
   <path d="M19.6 19.6 L26 26" />
   <path d="M10.6 12.2 a4 4 0 0 1 3 -2.4" />
  </>}
 </svg>;
}
