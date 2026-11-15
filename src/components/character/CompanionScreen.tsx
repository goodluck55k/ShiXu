"use client";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/application/AppProvider";
import { useBehaviorRuntime } from "@/application/useBehaviorRuntime";
import { BEHAVIOR_V2 } from "@/config/behavior";
import { deriveCharacterView } from "@/domain/characterView";
import { derivePersonality } from "@/domain/personality";
import { CharacterRenderer } from "./CharacterRenderer";
import { OfflineLifePanel } from "./OfflineLifePanel";
import { ReunionPanel } from "./ReunionPanel";

// Presentation-only destinations; behavior selection and weights remain in the existing engine.
const DESTINATIONS: Record<string, number> = { window_gaze: 32, observe_object: 68, corner_hide: 68, quiet_sit: 60, knee_rest: 60, sit_alone: 60 };
const WALKING = new Set(["wander_explore", "approach_novel", "hesitant_approach", "slow_walk"]);
export function CompanionScreen() {
 const { state } = useApp();
 const { decision, view, paused, interact, feedbackActive } = useBehaviorRuntime();
 const [position, setPosition] = useState(50);
 const positionRef = useRef(50);
 const [direction, setDirection] = useState<"left" | "right">("right");
 const [moving, setMoving] = useState(false);
 useEffect(() => {
   if (!decision || paused || decision.category === "interaction" || decision.reasonCode === "save_feedback") return;
   const target = DESTINATIONS[decision.behaviorId] ?? (WALKING.has(decision.behaviorId) ? (positionRef.current < 50 ? 65 : 35) : undefined);
   if (target === undefined || Math.abs(target - positionRef.current) < 1) return;
   let frame = 0;
   const startPosition = positionRef.current;
   const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
   let startTime: number | null = null;
   frame = window.requestAnimationFrame(function move(time) {
     if (startTime === null) { startTime = time; setDirection(target < startPosition ? "left" : "right"); setMoving(!reduced); }
     const progress = reduced ? 1 : Math.min(1, (time - startTime) / 2300);
     const eased = progress * progress * (3 - 2 * progress);
     positionRef.current = startPosition + (target - startPosition) * eased;
     setPosition(positionRef.current);
     if (progress < 1) frame = window.requestAnimationFrame(move); else setMoving(false);
   });
   return () => { window.cancelAnimationFrame(frame); setMoving(false); };
 }, [decision, paused]);
 const snapshot = state.snapshot;
 if (!snapshot) return null;
 const personality = derivePersonality(snapshot.personality);
 const behaviorLabel = decision ? BEHAVIOR_V2.behaviors.find(b => b.id === decision.behaviorId)?.label : null;
 const showHearts = feedbackActive && state.lastConfirmedSave?.emotion.label === "joy" && !paused;
 return <div className="page companion-page"><header className="page-header home-header"><div><p className="eyebrow">A LITTLE HOME FOR SHIXU</p><h1>企鹅小屋<span className="title-dot">.</span></h1><p>在这里，和拾绪一起慢慢生活。</p></div></header>
 <section className="room-layout" aria-label="企鹅的生活空间"><div className="scene"><div className="room-art" aria-hidden="true"/><div className={paused ? "scene-character is-paused" : "scene-character"} style={{left: `${position}%`}}><CharacterRenderer view={moving && decision?.category !== "interaction" && !feedbackActive ? { ...(view ?? deriveCharacterView(snapshot)), pose: "walk", animation: "walk" } : view ?? deriveCharacterView(snapshot)} direction={moving && decision?.category !== "interaction" && !feedbackActive ? direction : undefined} sceneMode />{showHearts && <span className="save-hearts" aria-hidden="true">♥</span>}</div><div className="room-foreground" aria-hidden="true">❧</div></div>
 <div className="home-side"><section className="home-status"><span className="section-kicker">A QUIET MOMENT</span><h2>🌱 今天的企鹅</h2><p>正在{behaviorLabel ?? "安静地待着"}</p><p>{personality.dominantDescription}</p></section><div className="behavior-controls" aria-label="与企鹅互动"><button type="button" onClick={() => interact("call")}>☼<br/>呼唤</button><button type="button" onClick={() => interact("pat")}>✋<br/>摸摸头</button><button type="button" onClick={() => interact("observe")}>⌕<br/>凑近看看</button></div><span className="behavior-status" aria-live="polite">{feedbackActive ? "企鹅回应了刚才的心情" : behaviorLabel}</span></div></section>
 <ReunionPanel/><OfflineLifePanel snapshot={snapshot}/></div>;
}
