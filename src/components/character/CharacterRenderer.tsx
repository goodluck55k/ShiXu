import type { CSSProperties } from "react";
import type { CharacterView } from "@/domain/types";
import { PenguinPose, type PenguinDirection } from "./PenguinPoses";

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
