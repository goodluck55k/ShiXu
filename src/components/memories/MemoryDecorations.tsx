import { PenguinPose } from "@/components/character/PenguinPoses";

type DecorationProps = { className?: string };

export function Sprig({ className }: DecorationProps) {
  return (
    <svg className={className} viewBox="0 0 70 120" aria-hidden="true" focusable="false">
      <path d="M34 116 C35 84 40 53 53 20" fill="none" stroke="#8fa45f" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M45 38 C30 34 21 24 20 12 C33 13 45 22 45 38 Z" fill="#aec27e" />
      <path d="M51 55 C66 50 74 39 73 27 C60 30 50 40 51 55 Z" fill="#c3d299" />
      <path d="M39 68 C24 65 15 54 14 42 C28 44 38 53 39 68 Z" fill="#9fb56d" />
      <path d="M47 84 C62 79 69 68 68 55 C55 59 46 69 47 84 Z" fill="#c8d7a2" />
      <path d="M34 96 C20 93 12 83 10 72 C23 73 33 82 34 96 Z" fill="#a9bf78" />
    </svg>
  );
}

export function LeafBranch({ className }: DecorationProps) {
  return (
    <svg className={className} viewBox="0 0 180 120" aria-hidden="true" focusable="false">
      <path d="M4 112 C53 97 91 71 122 37 C139 18 156 9 176 5" fill="none" stroke="#8e9f56" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M38 91 C24 78 27 62 40 52 C52 64 52 79 38 91 Z" fill="#a9bc72" />
      <path d="M55 82 C42 65 48 49 62 42 C72 57 69 72 55 82 Z" fill="#c3d192" />
      <path d="M75 68 C66 49 75 34 90 30 C97 47 90 61 75 68 Z" fill="#9eb468" />
      <path d="M97 51 C92 33 103 20 118 19 C121 36 112 48 97 51 Z" fill="#c8d7a0" />
      <path d="M121 33 C121 17 134 7 148 10 C146 25 136 34 121 33 Z" fill="#a9bc72" />
      <path d="M75 67 C58 68 47 78 45 91 C60 91 72 82 75 67 Z" fill="#b9ca87" />
      <path d="M103 46 C90 56 87 70 93 82 C105 75 111 61 103 46 Z" fill="#b2c57e" />
    </svg>
  );
}

export function DaisyCluster({ className }: DecorationProps) {
  return (
    <svg className={className} viewBox="0 0 130 110" aria-hidden="true" focusable="false">
      <path d="M24 106 C30 84 40 66 58 52" fill="none" stroke="#8fa45f" strokeWidth="2" strokeLinecap="round" />
      <path d="M64 102 C68 84 78 69 94 60" fill="none" stroke="#8fa45f" strokeWidth="2" strokeLinecap="round" />
      <path d="M31 88 C17 84 9 74 10 63 C23 65 32 75 31 88 Z" fill="#a9bf78" />
      <path d="M76 86 C63 80 57 69 59 58 C71 62 79 73 76 86 Z" fill="#c3d299" />
      <g transform="translate(58 40)">
        <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#fffdf4" />
        <ellipse cx="13" cy="-5" rx="7" ry="12" fill="#fffdf4" transform="rotate(72 13 -5)" />
        <ellipse cx="8" cy="12" rx="7" ry="12" fill="#fffdf4" transform="rotate(144 8 12)" />
        <ellipse cx="-8" cy="12" rx="7" ry="12" fill="#fffdf4" transform="rotate(216 -8 12)" />
        <ellipse cx="-13" cy="-5" rx="7" ry="12" fill="#fffdf4" transform="rotate(288 -13 -5)" />
        <circle r="6" fill="#e7be62" />
      </g>
      <g transform="translate(96 48) scale(.8)">
        <ellipse cx="0" cy="-14" rx="7" ry="12" fill="#fffdf4" />
        <ellipse cx="13" cy="-5" rx="7" ry="12" fill="#fffdf4" transform="rotate(72 13 -5)" />
        <ellipse cx="8" cy="12" rx="7" ry="12" fill="#fffdf4" transform="rotate(144 8 12)" />
        <ellipse cx="-8" cy="12" rx="7" ry="12" fill="#fffdf4" transform="rotate(216 -8 12)" />
        <ellipse cx="-13" cy="-5" rx="7" ry="12" fill="#fffdf4" transform="rotate(288 -13 -5)" />
        <circle r="6" fill="#e7be62" />
      </g>
    </svg>
  );
}

export function Clover({ className }: DecorationProps) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <path d="M31 31 C23 22 12 20 8 26 C4 32 11 41 22 41 C13 48 12 56 18 59 C24 62 31 53 32 43 C36 53 45 60 51 56 C57 52 51 43 41 40 C52 40 59 32 55 26 C51 20 41 21 33 30 Z" fill="#9cb86a" />
      <path d="M32 43 C32 50 30 56 28 60" fill="none" stroke="#7f9c50" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function MemoryPenguin({ className }: DecorationProps) {
  return (
    <span className={`scrapbook-penguin ${className ?? ""}`} aria-hidden="true">
      <span className="scrapbook-penguin-cushion" />
      <span className="scrapbook-penguin-body">
        <PenguinPose direction="front" seated expression="happy" />
      </span>
      <span className="scrapbook-penguin-book" />
      <span className="scrapbook-penguin-steam" />
    </span>
  );
}

export function BookStack({ className }: DecorationProps) {
  return (
    <span className={`scrapbook-book-stack ${className ?? ""}`} aria-hidden="true">
      <i /><i /><i />
    </span>
  );
}
