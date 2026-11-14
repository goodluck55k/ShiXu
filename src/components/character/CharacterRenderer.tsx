import type { CSSProperties } from "react";
import type { CharacterView } from "@/domain/types";
import { PenguinPose, type PenguinDirection } from "./PenguinPoses";
import { SPECIAL_MOTION_MS } from "./specialMotion";

const animations = new Set(["none", "breathe", "bounce", "sway", "wave", "spin", "walk", "react"]);

export function CharacterRenderer({ view, direction, motionOff = false }: { view: CharacterView; direction?: PenguinDirection; motionOff?: boolean }) {
  const animation = animations.has(view.animation) ? view.animation : "none";
  const seated = ["sit", "kneel", "curl"].includes(view.pose);
  const offset = view.pose === "corner" ? "translate(-64 6)" : view.pose === "window" ? "translate(56 0)" : undefined;
  const rest = view.pose === "kneel" || view.pose === "curl" ? view.pose : undefined;
  const pondering = view.behaviorId === "window_gaze";
  const amplitude = Number.isFinite(view.amplitude) ? Math.max(0, Math.min(1.5, view.amplitude!)) : 1;
  const turning = !direction && animation === "spin";
  const facing = direction ?? (animation === "walk" ? "right" : "front");
  const special = view.behaviorId === "smoke" || view.behaviorId === "drink" ? view.behaviorId : undefined;
  if (special) return <svg viewBox="0 0 240 320" role="img" aria-label={special === "smoke" ? "企鹅抽烟动作" : "企鹅喝酒动作"} className={`character-svg penguin-action special-action special-${special}${motionOff ? " motion-off" : ""}`} style={{ "--special-duration": `${SPECIAL_MOTION_MS}ms` } as CSSProperties}>
    <ellipse cx="120" cy="300" rx="66" ry="11" fill="#697d5b" opacity=".22" />
    <g className="special-standing" transform="translate(22 111)"><PenguinPose expression="neutral" /></g>
    <g className="special-seated" transform="translate(22 111)"><PenguinPose seated special={special} expression={special === "drink" ? "tired" : "soft"} /></g>
    {special === "smoke" && <g className="smoke-layer" aria-hidden="true" fill="none" stroke="#a8a8a1" strokeWidth="3" strokeLinecap="round"><path d="M212 220 C204 210 218 205 212 195 C207 187 216 183 213 176" /><path d="M221 214 C216 207 225 202 221 195" opacity=".65" /></g>}
  </svg>;
  return <svg viewBox="0 0 240 320" role="img" aria-label="陪伴企鹅" className={`character-svg penguin-action action-${animation}${pondering ? " is-pondering" : ""}${motionOff ? " motion-off" : ""}`} style={{ "--amp": String(amplitude) } as CSSProperties}>
    <g transform={offset}>
    {pondering && <g className="ponder-mark" aria-hidden="true"><text x="154" y="102" textAnchor="middle" fontSize="32" fontWeight="700" fill="#494139">?</text></g>}
    <ellipse cx="120" cy="300" rx="66" ry="11" fill="#697d5b" opacity=".22" />
    <g className={`penguin-body${seated ? " is-seated" : ""}`} transform="translate(22 111)">
      {turning ? <>
        <g className="turn-front"><PenguinPose expression={view.expression} /></g>
        <g className="turn-right"><PenguinPose direction="right" /></g>
        <g className="turn-back"><PenguinPose direction="back" /></g>
        <g className="turn-left"><PenguinPose direction="left" /></g>
      </> : facing === "front" ? <>
        <g className={`standing-pose${seated ? " pose-hidden" : ""}`}><PenguinPose expression={view.expression} /></g>
        <g className={`sitting-pose${seated ? "" : " pose-hidden"}`}><PenguinPose seated rest={rest} expression={view.expression} /></g>
      </> : <PenguinPose direction={facing} expression={view.expression} />}
    </g>
    </g>
  </svg>;
}
