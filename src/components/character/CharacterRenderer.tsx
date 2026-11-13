import type { CSSProperties } from "react";
import type { CharacterView } from "@/domain/types";

const POSE_TRANSFORMS: Record<string, string> = {
  stand: "",
  sit: "translate(0 26) scale(1 .88)",
  kneel: "translate(0 40) scale(1 .78)",
  curl: "translate(0 34) scale(.85 .8)",
  corner: "translate(-64 6)",
  window: "translate(56 0)",
  walk: "",
};

const KNOWN_ANIMATIONS = new Set(["none", "breathe", "bounce", "sway", "wave", "spin", "walk", "react"]);

function Face({ expression }: { expression: string }) {
  const ink = "#8a7f70";
  const dots = (
    <>
      <circle cx="102" cy="86" r="3" fill={ink} />
      <circle cx="138" cy="86" r="3" fill={ink} />
    </>
  );
  switch (expression) {
    case "happy":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none"><path d="M96 86 q6 -8 12 0" /><path d="M132 86 q6 -8 12 0" /><path d="M108 104 q12 10 24 0" /></g>;
    case "soft":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">{dots}<path d="M112 104 q8 6 16 0" /></g>;
    case "sad":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">{dots}<path d="M110 110 q10 -8 20 0" /></g>;
    case "wary":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none"><circle cx="102" cy="86" r="4.5" /><circle cx="138" cy="86" r="4.5" /><circle cx="120" cy="107" r="4" /></g>;
    case "angry":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none"><path d="M94 78 l14 6" /><path d="M146 78 l-14 6" />{dots}<path d="M110 110 q10 -7 20 0" /></g>;
    case "tired":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none"><path d="M96 86 h12" /><path d="M132 86 h12" /><path d="M112 106 h16" /></g>;
    case "mixed":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">{dots}<path d="M110 106 q5 -5 10 0 q5 5 10 0" /></g>;
    case "blank":
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none"><circle cx="102" cy="86" r="4" /><circle cx="138" cy="86" r="4" /><path d="M112 107 h16" /></g>;
    default:
      return <g stroke={ink} strokeWidth="3" strokeLinecap="round" fill="none">{dots}<path d="M112 106 h16" /></g>;
  }
}

export function CharacterRenderer({ view }: { view: CharacterView }) {
  const pose = POSE_TRANSFORMS[view.pose] ?? "";
  const animation = KNOWN_ANIMATIONS.has(view.animation) ? view.animation : "none";
  return (
    <svg
      viewBox="0 0 240 320"
      role="img"
      aria-label="纯白小人（临时占位表现）"
      className={`character-svg anim-${animation}`}
      style={{ "--amp": String(view.amplitude ?? 1) } as CSSProperties}
    >
      <defs>
        <radialGradient id="bodyShade" cx="40%" cy="30%" r="75%">
          <stop stopColor="#fff" />
          <stop offset=".78" stopColor="#fffdf9" />
          <stop offset="1" stopColor="#e9e2d7" />
        </radialGradient>
      </defs>
      <ellipse cx="120" cy="300" rx="66" ry="11" fill="#697d5b" opacity=".22" />
      <g transform={pose || undefined}>
        <g fill="url(#bodyShade)" stroke="#d7cabc" strokeWidth="2.5" strokeLinejoin="round">
          <path d="M88 207 Q83 238 88 279 Q89 293 103 293 Q116 293 117 280 L120 242 L123 280 Q124 293 137 293 Q151 293 152 279 Q157 238 152 207Z" />
          <path d="M86 144 Q70 156 63 197 Q59 216 71 219 Q83 222 88 203 L97 176 M154 144 Q170 156 177 197 Q181 216 169 219 Q157 222 152 203 L143 176" />
          <path d="M94 137 Q120 125 146 137 Q158 149 156 188 L152 216 Q145 232 120 233 Q95 232 88 216 L84 188 Q82 149 94 137Z" />
          <circle cx="120" cy="88" r="57" />
        </g>
        <Face expression={view.expression} />
      </g>
    </svg>
  );
}