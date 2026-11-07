import type { CharacterView } from "@/domain/types";

export function CharacterRenderer({ view }: { view: CharacterView }) {
  void view;
  return (
    <svg
      viewBox="0 0 240 320"
      role="img"
      aria-label="初始的白色小人，还没有表情"
      className="mx-auto h-52 w-auto sm:h-60"
    >
      <ellipse cx="120" cy="302" rx="52" ry="9" fill="#e7e5e4" />
      <g fill="#ffffff" stroke="#d6d3d1" strokeWidth="3">
        <rect x="95" y="212" width="21" height="82" rx="10.5" />
        <rect x="124" y="212" width="21" height="82" rx="10.5" />
        <rect x="66" y="138" width="19" height="66" rx="9.5" transform="rotate(9 75 140)" />
        <rect x="155" y="138" width="19" height="66" rx="9.5" transform="rotate(-9 165 140)" />
        <rect x="86" y="124" width="68" height="98" rx="30" />
        <circle cx="120" cy="80" r="42" />
      </g>
    </svg>
  );
}