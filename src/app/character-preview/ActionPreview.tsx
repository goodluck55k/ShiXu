"use client";

import { useEffect, useState } from "react";
import { CharacterRenderer } from "@/components/character/CharacterRenderer";
import { PenguinPose, type PenguinDirection } from "@/components/character/PenguinPoses";
import type { CharacterView } from "@/domain/types";
import { SPECIAL_MOTION_MS } from "@/components/character/specialMotion";

const actions = [
  ["呼吸与眨眼", "stand", "breathe"], ["左右转身", "stand", "spin"],
  ["走路", "walk", "walk"], ["坐下与起身", "sit", "none"],
  ["安静休息", "kneel", "none"], ["蜷缩", "curl", "none"],
  ["躲到角落", "corner", "none"], ["靠窗沉思", "window", "none"], ["挥翅", "stand", "wave"],
  ["看向用户", "stand", "react"], ["轻微蹦跳", "stand", "bounce"], ["开心晃动", "stand", "sway"],
] as const;
const directions: [PenguinDirection, string][] = [["front", "正面"], ["left", "左侧"], ["right", "右侧"], ["back", "背面"]];
const idle: CharacterView = { pose: "stand", expression: "neutral", animation: "none", visibleLayerIds: [], effects: [] };

export function ActionPreview() {
  const [choice, setChoice] = useState(0);
  const [running, setRunning] = useState(false);
  const [motionOff, setMotionOff] = useState(false);
  const [run, setRun] = useState(0);
  useEffect(() => {
    if (!running) return;
    const timer = window.setTimeout(() => setRunning(false), 4000);
    const hidden = () => { if (document.hidden) setRunning(false); };
    document.addEventListener("visibilitychange", hidden);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", hidden); };
  }, [running, run]);
  const selected = actions[choice];
  const view = running ? { ...idle, pose: selected[1], animation: selected[2], behaviorId: selected[1] === "window" ? "window_gaze" : undefined } : idle;
  return <section>
    <h2>侧背面与动作 · 视觉待用户验收</h2>
    <p>原创延展，动作参数待验收。选择动作后播放四秒并回到待机；系统低动态设置也会生效。</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "end" }}>
      {directions.map(([direction, label]) => <div key={direction} style={{ textAlign: "center", width: 140 }}><div style={{ width: 140, height: 145 }}><svg viewBox="0 0 195 201" width="140" height="145"><PenguinPose direction={direction} /></svg></div>{label}</div>)}
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 24 }}>
      {actions.map(([label], index) => <button type="button" key={label} aria-pressed={choice === index} onClick={() => { setChoice(index); setRunning(true); setRun(n => n + 1); }} style={{ padding: 8, border: "1px solid #a79987", background: choice === index ? "#e8d7bd" : "white" }}>{label}</button>)}
      <button type="button" onClick={() => { setRunning(true); setRun(n => n + 1); }} style={{ padding: 8 }}>重新播放</button>
      <label><input type="checkbox" checked={motionOff} onChange={e => setMotionOff(e.target.checked)} /> 关闭动画</label>
    </div>
    <p aria-live="polite">{running ? `${selected[0]}：进行中` : "待机（动作已结束）"}</p>
    <div style={{ display: "flex", alignItems: "end", gap: 32 }} key={run}>
      {[180, 64].map(size => <div key={size} style={{ width: size, textAlign: "center" }}><CharacterRenderer view={view} motionOff={motionOff} /><p>{size === 180 ? "正常尺寸" : "小尺寸"}</p></div>)}
    </div>
  </section>;
}

export function SpecialPreview() {
  const [choice, setChoice] = useState<"smoke" | "drink">("smoke");
  const [active, setActive] = useState(false);
  const [run, setRun] = useState(0);
  const [motionOff, setMotionOff] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = window.setTimeout(() => setActive(false), SPECIAL_MOTION_MS);
    const hidden = () => { if (document.hidden) setActive(false); };
    document.addEventListener("visibilitychange", hidden);
    return () => { window.clearTimeout(timer); document.removeEventListener("visibilitychange", hidden); };
  }, [active, run]);
  const play = (next: "smoke" | "drink") => { setChoice(next); setActive(true); setRun(n => n + 1); };
  const view = active ? { ...idle, behaviorId: choice } : idle;
  return <section>
    <h2>特殊行为 · 视觉待用户验收</h2>
    <p>仅供开发预览；播放结束或页面隐藏后回到待机，正式触发仍关闭。</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      <button type="button" onClick={() => play("smoke")}>播放抽烟</button>
      <button type="button" onClick={() => play("drink")}>播放喝酒</button>
      <button type="button" onClick={() => play(choice)}>重新播放</button>
      <label><input type="checkbox" checked={motionOff} onChange={e => setMotionOff(e.target.checked)} /> 关闭动画</label>
      <label><input type="checkbox" checked={reduced} onChange={e => setReduced(e.target.checked)} /> 低动态模式</label>
    </div>
    <p aria-live="polite">{active ? `${choice === "smoke" ? "抽烟" : "喝酒"}：进行中` : "待机（动作已结束）"}</p>
    <div key={run} style={{ display: "flex", alignItems: "end", gap: 32 }}>
      {[180, 64].map(size => <div key={size} style={{ width: size, textAlign: "center" }}><CharacterRenderer view={view} motionOff={motionOff || reduced} /><p>{size === 180 ? "正常尺寸" : "64px"}</p></div>)}
    </div>
  </section>;
}
