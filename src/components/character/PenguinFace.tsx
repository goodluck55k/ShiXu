const INK = "#100e0c";
const OUTLINE = "#211a15";
const BEAK = "#ed9e25";

type Eye = "open" | "happy" | "soft" | "sad" | "wary" | "angry" | "tired" | "mixed" | "blank";
type FaceSpec = { left: Eye; right: Eye; beak?: "small" | "down" };

// Face shapes are visual-only: the behavior engine owns expression selection.
const FACES: Record<string, FaceSpec> = {
  neutral: { left: "open", right: "open" },
  happy: { left: "happy", right: "happy" },
  soft: { left: "soft", right: "soft" },
  sad: { left: "sad", right: "sad", beak: "down" },
  wary: { left: "wary", right: "wary", beak: "small" },
  angry: { left: "angry", right: "angry" },
  tired: { left: "tired", right: "tired" },
  mixed: { left: "mixed", right: "open", beak: "small" },
  blank: { left: "blank", right: "blank" },
};

function EyeShape({ kind, x, mirror = false }: { kind: Eye; x: number; mirror?: boolean }) {
  const transform = `translate(${x} 52) scale(${mirror ? -1 : 1} 1)`;
  const line = { fill: "none", stroke: INK, strokeWidth: 2.5, strokeLinecap: "round" as const };
  return <g transform={transform} data-eye={kind}>
    {kind === "open" && <circle r="6.8" fill={INK} />}
    {kind === "happy" && <path d="M-6 2 Q0 -8 6 2" {...line} strokeWidth="3.2" />}
    {kind === "soft" && <path d="M-6 1 Q0 -3 6 1" {...line} />}
    {kind === "sad" && <><path d="M-6 -3 Q0 -5 6 -1 L6 1 Q0 5 -6 1 Z" fill={INK} /><path d="M-6 -7 Q-2 -9 2 -7" {...line} strokeWidth="1.8" /></>}
    {kind === "wary" && <><ellipse cy="1" rx="4.8" ry="5.8" fill={INK} /><path d="M-6 -8 Q-2 -11 3 -9" {...line} strokeWidth="2" /></>}
    {kind === "angry" && <><circle cy="1" r="5.3" fill={INK} /><path d="M-6 -8 L5 -5" {...line} strokeWidth="2.3" /></>}
    {kind === "tired" && <><path d="M-6 0 Q0 3 6 0" {...line} /><path d="M-5 0 Q0 6 5 0" fill={INK} /></>}
    {kind === "mixed" && <><circle cy="1" r="5.5" fill={INK} /><path d="M-6 -8 Q-2 -10 3 -7" {...line} strokeWidth="2" /></>}
    {kind === "blank" && <ellipse cy="1" rx="4.2" ry="5.5" fill={INK} />}
  </g>;
}

export function PenguinFace({ expression = "neutral" }: { expression?: string }) {
  const face = Object.hasOwn(FACES, expression) ? FACES[expression] : FACES.neutral;
  return <g data-part="face">
    <EyeShape kind={face.left} x={68} />
    <EyeShape kind={face.right} x={121} mirror />
    {face.beak === "down"
      ? <path data-part="beak" d="M85 57 Q94.5 51 104 57 Q102 62 94.5 61 Q87 62 85 57 Z" fill={BEAK} stroke={OUTLINE} strokeWidth="1.5" />
      : <ellipse data-part="beak" cx="94.5" cy="57" rx={face.beak === "small" ? 7.5 : 9.6} ry={face.beak === "small" ? 4.3 : 5.4} fill={BEAK} stroke={OUTLINE} strokeWidth="1.5" />}
  </g>;
}
