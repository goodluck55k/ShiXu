import type { CSSProperties } from "react";
import type { CharacterView } from "@/domain/types";
import { PenguinPose, type PenguinDirection } from "./PenguinPoses";

const animations = new Set(["none", "breathe", "bounce", "sway", "wave", "spin", "walk", "react"]);

export function CharacterRenderer({ view, direction, motionOff = false }: { view: CharacterView; direction?: PenguinDirection; motionOff?: boolean }) {
  const animation = animations.has(view.animation) ? view.animation : "none";
  const seated = ["sit", "kneel", "curl"].includes(view.pose);
  const turning = !direction && animation === "spin";
  const facing = direction ?? (animation === "walk" ? "right" : "front");
  return <svg viewBox="0 0 240 320" role="img" aria-label="陪伴企鹅" className={`character-svg penguin-action action-${animation}${motionOff ? " motion-off" : ""}`} style={{ "--amp": String(view.amplitude ?? 1) } as CSSProperties}>
    <ellipse cx="120" cy="300" rx="66" ry="11" fill="#697d5b" opacity=".22" />
    <g className={`penguin-body${seated ? " is-seated" : ""}`} transform="translate(22 111)">
      {turning ? <>
        <g className="turn-front"><PenguinPose expression={view.expression} /></g>
        <g className="turn-right"><PenguinPose direction="right" /></g>
        <g className="turn-back"><PenguinPose direction="back" /></g>
        <g className="turn-left"><PenguinPose direction="left" /></g>
      </> : facing === "front" ? <>
        <g className={`standing-pose${seated ? " pose-hidden" : ""}`}><PenguinPose expression={view.expression} /></g>
        <g className={`sitting-pose${seated ? "" : " pose-hidden"}`}><PenguinPose seated expression={view.expression} /></g>
      </> : <PenguinPose direction={facing} expression={view.expression} />}
    </g>
  </svg>;
}
