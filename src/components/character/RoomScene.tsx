"use client";
import { useEffect, useRef, useState } from "react";
import type { BehaviorDecision } from "@/domain/behavior";
import type { CharacterView } from "@/domain/types";
import { CharacterRenderer } from "./CharacterRenderer";
import { ROOM_ZONES, roomDestination, roomRoute, type RoomPoint } from "./roomLayout";

// The room is a fixed illustration. Only the penguin and camera animate; no frame updates reach React.
export function RoomScene({ decision, view, paused, feedbackActive, showHearts, reunionPending }: {
  decision: BehaviorDecision | null; view: CharacterView; paused: boolean; feedbackActive: boolean; showHearts: boolean; reunionPending: boolean;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const penguinRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<RoomPoint>(ROOM_ZONES.center);
  const animationsRef = useRef<Animation[]>([]);
  const [motion, setMotion] = useState<"left" | "right" | null>(null);
  const behaviorId = decision?.behaviorId;
  const category = decision?.category;
  const reason = decision?.reasonCode;

  useEffect(() => {
    const canvas = canvasRef.current;
    const penguin = penguinRef.current;
    const viewport = viewportRef.current;
    if (!canvas || !penguin || !viewport) return;
    // Optional CSS insets mark viewport edges covered by floating UI (sidebar, status notes),
    // so the camera centres the penguin in the visible stage rather than the raw viewport.
    function inset(name: string) {
      const value = parseFloat(getComputedStyle(viewport!).getPropertyValue(name));
      return Number.isFinite(value) ? value : 0;
    }
    function cameraX(x: number) {
      const stageCenter = (inset("--camera-inset-left") + viewport!.clientWidth - inset("--camera-inset-right")) / 2;
      return Math.min(0, Math.max(viewport!.clientWidth - canvas!.clientWidth, stageCenter - canvas!.clientWidth * x / 100));
    }
    function stop() {
      if (animationsRef.current.length) {
        const style = getComputedStyle(penguin!);
        positionRef.current = { x: parseFloat(style.left) / canvas!.clientWidth * 100, y: parseFloat(style.top) / canvas!.clientHeight * 100 };
        animationsRef.current.forEach(animation => animation.cancel());
        animationsRef.current = [];
      }
      penguin!.style.left = `${positionRef.current.x}%`;
      penguin!.style.top = `${positionRef.current.y}%`;
      canvas!.style.transform = `translateX(${cameraX(positionRef.current.x)}px)`;
    }
    stop();
    let lastWidth = viewport.clientWidth;
    let lastHeight = viewport.clientHeight;
    const resize = new ResizeObserver(() => {
      if (viewport.clientWidth === lastWidth && viewport.clientHeight === lastHeight) return;
      lastWidth = viewport.clientWidth; lastHeight = viewport.clientHeight;
      stop(); setMotion(null);
    });
    resize.observe(viewport);
    let frame = 0;
    const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const preferenceChanged = () => { if (motionPreference.matches) { window.cancelAnimationFrame(frame); stop(); setMotion(null); } };
    motionPreference.addEventListener("change", preferenceChanged);
    const cleanup = () => { resize.disconnect(); motionPreference.removeEventListener("change", preferenceChanged); stop(); };
    if (!behaviorId || !decision || paused || reunionPending || feedbackActive || category === "interaction" || category === "special" || reason === "save_feedback" || motionPreference.matches) {
      return cleanup;
    }
    const destination = roomDestination(behaviorId, positionRef.current);
    const points = destination ? roomRoute(positionRef.current, destination) : [];
    if (!points.length) return cleanup;
    const target = points[points.length - 1];
    frame = window.requestAnimationFrame(() => {
      setMotion(target.x < positionRef.current.x ? "left" : "right");
      const duration = 2600;
      const options: KeyframeAnimationOptions = { duration, easing: "ease-in-out", fill: "forwards" };
      const move = penguin.animate(points.map(p => ({ left: `${p.x}%`, top: `${p.y}%` })), options);
      const camera = canvas.animate(points.map(p => ({ transform: `translateX(${cameraX(p.x)}px)` })), options);
      animationsRef.current = [move, camera];
      move.onfinish = () => { positionRef.current = target; stop(); setMotion(null); };
    });
    return () => { window.cancelAnimationFrame(frame); cleanup(); setMotion(null); };
  }, [behaviorId, category, reason, paused, reunionPending, feedbackActive, decision]);

  const walking = motion !== null && !paused && !reunionPending && !feedbackActive && category !== "interaction" && category !== "special";
  return <div className={`scene${paused ? " is-paused" : ""}`} ref={viewportRef} aria-label="企鹅的绘本小屋">
    <div className="room-canvas" ref={canvasRef}>
      <div className="room-art" aria-hidden="true" />
      <RoomLight />
      <div className={`scene-character${paused ? " is-paused" : ""}`} ref={penguinRef} style={{ left: `${ROOM_ZONES.center.x}%`, top: `${ROOM_ZONES.center.y}%` }}>
        <CharacterRenderer key={walking ? motion : "front"} view={walking ? { ...view, pose: "walk", animation: "walk" } : view} direction={walking ? motion : undefined} sceneMode />
        {showHearts && <span className="save-hearts" aria-hidden="true">♥</span>}
      </div>
      <svg className="room-overlay" viewBox="0 0 1000 334" preserveAspectRatio="none" aria-hidden="true">
        <g transform="translate(48 -38)" fill="none" stroke="#66834a" strokeWidth="2.5" strokeLinecap="round"><path d="M155 334 Q160 301 147 278 M155 334 Q166 307 177 300 M776 334 Q782 310 795 293" /></g>
        <g transform="translate(48 -38)" fill="#7e9a58"><ellipse cx="148" cy="286" rx="5" ry="13" transform="rotate(-40 148 286)"/><ellipse cx="171" cy="306" rx="5" ry="13" transform="rotate(46 171 306)"/><ellipse cx="790" cy="302" rx="5" ry="14" transform="rotate(34 790 302)"/></g>
        <g transform="translate(48 -38)" fill="#fff8df"><circle cx="144" cy="277" r="4"/><circle cx="139" cy="281" r="4"/><circle cx="147" cy="283" r="4"/><circle cx="178" cy="297" r="4"/><circle cx="174" cy="301" r="4"/><circle cx="182" cy="302" r="4"/></g><g transform="translate(48 -38)" fill="#e9bf61"><circle cx="143" cy="281" r="2.5"/><circle cx="178" cy="301" r="2.5"/></g>
        <g transform="translate(320 292)" fill="none" stroke="#789454" strokeWidth="2"><path d="M0 15 Q2 4 -4 -5 M0 15 Q4 5 10 2"/><ellipse cx="-5" cy="-4" rx="3" ry="6" fill="#a7b871" transform="rotate(-35 -5 -4)"/><ellipse cx="9" cy="2" rx="3" ry="6" fill="#a7b871" transform="rotate(45 9 2)"/></g>
      </svg>
    </div>
  </div>;
}

// Afternoon light from the arched window: two soft beams and a few drifting motes.
// Pure decoration in the room's 1000 × 334 overlay space; it follows the camera with the canvas.
const MOTES = [
  { x: 300, y: 150, r: 2.2, d: "0s" }, { x: 352, y: 196, r: 1.6, d: "-3s" }, { x: 418, y: 132, r: 1.9, d: "-6s" },
  { x: 446, y: 214, r: 1.4, d: "-1.5s" }, { x: 262, y: 222, r: 1.7, d: "-4.5s" }, { x: 498, y: 176, r: 1.5, d: "-7.5s" },
];
function RoomLight() {
  return <svg className="room-light" viewBox="0 0 1000 334" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="room-beam" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#fff6d8" stopOpacity=".85" />
        <stop offset=".55" stopColor="#ffe9b8" stopOpacity=".38" />
        <stop offset="1" stopColor="#ffe2a8" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="room-pool" cx=".5" cy=".5" r=".5">
        <stop offset="0" stopColor="#fff1c9" stopOpacity=".55" />
        <stop offset="1" stopColor="#fff1c9" stopOpacity="0" />
      </radialGradient>
    </defs>
    <g className="room-beams">
      <path d="M118 22 L200 14 L560 300 L380 318 Z" fill="url(#room-beam)" />
      <path d="M232 30 L300 26 L700 292 L556 306 Z" fill="url(#room-beam)" opacity=".7" />
    </g>
    <ellipse className="room-pool" cx="520" cy="268" rx="230" ry="34" fill="url(#room-pool)" />
    <g className="room-motes" fill="#fffbe8">
      {MOTES.map((m, i) => <circle key={i} cx={m.x} cy={m.y} r={m.r} style={{ animationDelay: m.d }} />)}
    </g>
  </svg>;
}
