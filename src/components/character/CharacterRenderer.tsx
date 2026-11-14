import type { CSSProperties } from "react";
import type { CharacterView } from "@/domain/types";
import { PenguinFront } from "./PenguinFront";

const POSE_TRANSFORMS: Record<string, string> = {
  stand: "",
  sit: "translate(0 36) scale(1 .88)",
  kneel: "translate(0 66) scale(1 .78)",
  curl: "translate(18 60) scale(.85 .8)",
  corner: "translate(-64 6)",
  window: "translate(56 0)",
  walk: "",
};

const KNOWN_ANIMATIONS = new Set(["none", "breathe", "bounce", "sway", "wave", "spin", "walk", "react"]);

export function CharacterRenderer({ view }: { view: CharacterView }) {
  const pose = POSE_TRANSFORMS[view.pose] ?? "";
  const animation = KNOWN_ANIMATIONS.has(view.animation) ? view.animation : "none";
  return (
    <svg
      viewBox="0 0 240 320"
      role="img"
      aria-label="陪伴企鹅"
      className={`character-svg anim-${animation}`}
      style={{ "--amp": String(view.amplitude ?? 1) } as CSSProperties}
    >
      <ellipse cx="120" cy="300" rx="66" ry="11" fill="#697d5b" opacity=".22" />
      <g transform={pose || undefined}>
        <g transform="translate(22 111)"><PenguinFront expression={view.expression} /></g>
      </g>
    </svg>
  );
}