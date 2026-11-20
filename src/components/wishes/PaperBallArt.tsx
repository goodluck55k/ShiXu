"use client";

import { useId } from "react";
import type { BallPalette } from "./wishLayout";

interface PaperBallArtProps {
  palette: BallPalette;
  variant: number;
  isBackRow?: boolean;
  onFloor?: boolean;
}

/**
 * Hand-crafted crumpled stationery paper ball (纸团) with 4 deterministic
 * asymmetrical crumpled-note silhouettes, overlapping folded paper flaps,
 * warm sunlit volume, and subtle handwritten-note ink hints inside the folds.
 */
export function PaperBallArt({ palette, variant, isBackRow = false, onFloor = false }: PaperBallArtProps) {
  const mode = ((variant % 4) + 4) % 4;
  const uid = useId().replace(/:/g, "");
  const gid = `pb-${uid}`;

  return (
    <g>
      <defs>
        <radialGradient id={`${gid}-vol`} cx=".34" cy=".28" r=".78">
          <stop offset="0" stopColor={palette.light} />
          <stop offset=".54" stopColor={palette.base} />
          <stop offset="1" stopColor={palette.dark} />
        </radialGradient>
        <linearGradient id={`${gid}-flap`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffef8" stopOpacity=".95" />
          <stop offset=".48" stopColor={palette.light} stopOpacity=".96" />
          <stop offset="1" stopColor={palette.base} stopOpacity=".98" />
        </linearGradient>
        <linearGradient id={`${gid}-shadow`} x1="0" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor={palette.dark} stopOpacity=".46" />
          <stop offset="1" stopColor={palette.line} stopOpacity=".16" />
        </linearGradient>
      </defs>

      {/* soft contact shadow under the paper ball */}
      <ellipse
        cx="1"
        cy={onFloor ? 34 : 31.5}
        rx={onFloor ? 32 : 28}
        ry={onFloor ? 8 : 7}
        fill="#7f4d24"
        opacity={onFloor ? 0.22 : 0.14}
      />

      {mode === 0 && <VariantFoldedPillow gid={gid} palette={palette} />}
      {mode === 1 && <VariantTuckedCorner gid={gid} palette={palette} />}
      {mode === 2 && <VariantSoftSwirl gid={gid} palette={palette} />}
      {mode === 3 && <VariantCurledNote gid={gid} palette={palette} />}

      {/* subtle warm rim bounce at bottom from glass & sunlight */}
      <path
        d="M-18 25 Q1 32 19 24"
        fill="none"
        stroke="#fff9eb"
        strokeWidth="2"
        strokeLinecap="round"
        opacity=".34"
      />

      {/* gentle depth veil for balls sitting further back in the jar */}
      {isBackRow && (
        <circle cx="0" cy="0" r="37" fill="#c78d58" opacity=".09" pointerEvents="none" />
      )}
    </g>
  );
}

/** Variant 0: Crumpled note with a pinched top-right corner and overlapping top-left fold flap. */
function VariantFoldedPillow({ gid, palette }: { gid: string; palette: BallPalette }) {
  return (
    <g>
      <path
        d="M-35 -3 Q-37 -19 -25 -29 L-9 -36 Q6 -32 22 -33 L33 -17 Q39 -4 34 11 Q28 24 17 31 L-3 34 Q-21 33 -31 20 Q-38 10 -35 -3 Z"
        fill={`url(#${gid}-vol)`}
        stroke={palette.line}
        strokeWidth="1.4"
        strokeOpacity=".74"
        strokeLinejoin="round"
      />
      {/* lower-right shaded fold pocket */}
      <path
        d="M5 1 Q20 3 34 11 Q28 24 17 31 L-3 34 Q-10 21 5 1 Z"
        fill={`url(#${gid}-shadow)`}
      />
      {/* faint ink lines peeking inside a fold */}
      <g stroke="#7d5838" strokeWidth="1.05" strokeLinecap="round" opacity=".15" fill="none">
        <path d="M9 -9 Q17 -11 25 -8" />
        <path d="M11 -3 Q19 -5 26 -2" />
      </g>
      {/* drop shadow under overlapping flap */}
      <path
        d="M-32 -7 Q-16 3 16 -8 Q13 1 -11 7 Q-25 5 -32 -7 Z"
        fill={palette.dark}
        opacity=".3"
      />
      {/* overlapping sunlit folded paper flap */}
      <path
        d="M-34 -10 Q-30 -24 -20 -31 L-8 -36 Q9 -32 20 -21 Q17 -10 10 -6 Q-12 -1 -34 -10 Z"
        fill={`url(#${gid}-flap)`}
        stroke={palette.line}
        strokeWidth="1.15"
        strokeOpacity=".6"
        strokeLinejoin="round"
      />
      {/* folded paper thickness edge highlight */}
      <path
        d="M-31 -10 Q-11 -2 12 -8"
        fill="none"
        stroke="#fffef8"
        strokeWidth="1.85"
        strokeLinecap="round"
        opacity=".8"
      />
      {/* crisp pinch creases */}
      <g fill="none" stroke={palette.line} strokeWidth="1.2" strokeLinecap="round" opacity=".52">
        <path d="M-11 -19 L-2 -14 L10 -22" />
        <path d="M-19 7 Q-6 14 7 6 L22 9" />
        <path d="M-13 27 L-5 15 L0 9" />
      </g>
      <g fill="none" stroke="#fffef7" strokeWidth="1.5" strokeLinecap="round" opacity=".62">
        <path d="M-23 -24 L-12 -30 L-3 -29" />
        <path d="M-16 14 Q-6 17 2 11" />
      </g>
    </g>
  );
}

/** Variant 1: Asymmetrical pinched slip with a tucked paper ear and creased waist. */
function VariantTuckedCorner({ gid, palette }: { gid: string; palette: BallPalette }) {
  return (
    <g>
      <path
        d="M-33 -12 Q-25 -29 -8 -33 Q7 -37 22 -30 L35 -14 Q36 0 32 15 L19 30 Q3 37 -14 33 Q-29 27 -35 12 Q-35 0 -33 -12 Z"
        fill={`url(#${gid}-vol)`}
        stroke={palette.line}
        strokeWidth="1.4"
        strokeOpacity=".74"
        strokeLinejoin="round"
      />
      {/* shaded lower pocket */}
      <path
        d="M-27 18 Q-11 10 8 19 Q21 23 31 15 L19 30 Q2 37 -14 33 Q-23 28 -27 18 Z"
        fill={`url(#${gid}-shadow)`}
      />
      {/* sunlit upper-left bulge */}
      <path
        d="M-32 -11 Q-25 -27 -8 -32 L2 -33 Q6 -19 -8 -6 Q-22 0 -32 -11 Z"
        fill={palette.light}
        opacity=".82"
      />
      {/* shadow cast by tucked right-top paper ear */}
      <path
        d="M2 -27 Q11 -11 35 -5 Q29 4 11 -1 Q0 -9 2 -27 Z"
        fill={palette.dark}
        opacity=".28"
      />
      {/* tucked right-top folded paper flap */}
      <path
        d="M3 -33 Q15 -33 24 -27 L35 -12 Q22 -6 7 -19 Z"
        fill={`url(#${gid}-flap)`}
        stroke={palette.line}
        strokeWidth="1.15"
        strokeOpacity=".6"
        strokeLinejoin="round"
      />
      <path
        d="M5 -24 Q16 -12 33 -12"
        fill="none"
        stroke="#fffef8"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity=".78"
      />
      {/* faint ink lines peeking inside fold */}
      <g stroke="#7d5838" strokeWidth="1.05" strokeLinecap="round" opacity=".15" fill="none">
        <path d="M-20 8 Q-12 6 -4 10" />
        <path d="M-18 14 Q-10 12 -5 15" />
      </g>
      {/* crumpled valley creases */}
      <g fill="none" stroke={palette.line} strokeWidth="1.2" strokeLinecap="round" opacity=".52">
        <path d="M-26 -5 L-11 -3 L-1 -9 L13 -2" />
        <path d="M-1 -9 L-3 8 L7 19 L23 11" />
        <path d="M-17 21 L-7 12" />
      </g>
      <g fill="none" stroke="#fffef7" strokeWidth="1.5" strokeLinecap="round" opacity=".64">
        <path d="M-22 -20 L-11 -27 L-3 -26" />
        <path d="M-18 -6 L-7 -5" />
      </g>
    </g>
  );
}

/** Variant 2: Gently squashed soft wad with curled lower-left paper lip and flat folded side. */
function VariantSoftSwirl({ gid, palette }: { gid: string; palette: BallPalette }) {
  return (
    <g>
      <path
        d="M-36 3 Q-36 -14 -24 -27 L-7 -35 Q12 -36 27 -24 Q37 -12 34 6 L27 22 Q12 35 -6 34 Q-25 32 -33 17 Z"
        fill={`url(#${gid}-vol)`}
        stroke={palette.line}
        strokeWidth="1.4"
        strokeOpacity=".74"
        strokeLinejoin="round"
      />
      {/* sunlit top fold */}
      <path
        d="M-27 -18 Q-17 -31 -4 -34 L16 -30 Q10 -16 -13 -12 Q-23 -12 -27 -18 Z"
        fill={palette.light}
        opacity=".84"
      />
      {/* shaded right pocket */}
      <path
        d="M11 -14 Q26 -9 34 6 L27 22 Q14 34 0 34 Q7 15 11 -14 Z"
        fill={`url(#${gid}-shadow)`}
      />
      {/* shadow under curled lower-left paper lip */}
      <path
        d="M-33 4 Q-16 -7 11 4 Q3 11 -25 9 Z"
        fill={palette.dark}
        opacity=".26"
      />
      {/* curled front-left paper fold */}
      <path
        d="M-35 4 Q-18 -4 10 5 Q6 20 -13 29 Q-28 26 -35 4 Z"
        fill={`url(#${gid}-flap)`}
        stroke={palette.line}
        strokeWidth="1.15"
        strokeOpacity=".58"
        strokeLinejoin="round"
      />
      <path
        d="M-32 4 Q-15 -3 8 5"
        fill="none"
        stroke="#fffef8"
        strokeWidth="1.8"
        strokeLinecap="round"
        opacity=".78"
      />
      {/* creases & highlights */}
      <g fill="none" stroke={palette.line} strokeWidth="1.2" strokeLinecap="round" opacity=".52">
        <path d="M-12 -24 L-1 -14 L14 -14 L27 -18" />
        <path d="M10 5 L20 3 L29 9" />
        <path d="M-15 12 Q-6 17 2 13" />
      </g>
      <g fill="none" stroke="#fffef7" strokeWidth="1.5" strokeLinecap="round" opacity=".62">
        <path d="M-18 -24 L-6 -29 L5 -26" />
        <path d="M14 -12 L24 -14" />
      </g>
    </g>
  );
}

/** Variant 3: Lightly crumpled square-ish note with diagonal wrap fold and tucked bottom edge. */
function VariantCurledNote({ gid, palette }: { gid: string; palette: BallPalette }) {
  return (
    <g>
      <path
        d="M-32 -14 L-15 -32 Q5 -37 24 -27 Q36 -15 36 3 L24 26 Q8 37 -12 32 Q-28 26 -35 9 Q-36 -3 -32 -14 Z"
        fill={`url(#${gid}-vol)`}
        stroke={palette.line}
        strokeWidth="1.4"
        strokeOpacity=".74"
        strokeLinejoin="round"
      />
      {/* lower shaded fold */}
      <path
        d="M-23 22 Q-5 13 21 23 Q10 36 -12 32 Z"
        fill={`url(#${gid}-shadow)`}
      />
      {/* diagonal crease shadow */}
      <path
        d="M-23 -19 Q-5 -3 27 0 Q19 9 -10 1 Q-22 -6 -23 -19 Z"
        fill={palette.dark}
        opacity=".26"
      />
      {/* upper-right folded layer */}
      <path
        d="M-23 -21 L-12 -32 Q10 -35 26 -24 Q35 -14 29 -1 Q6 0 -23 -21 Z"
        fill={`url(#${gid}-flap)`}
        stroke={palette.line}
        strokeWidth="1.15"
        strokeOpacity=".58"
        strokeLinejoin="round"
      />
      <path
        d="M-21 -20 Q3 -3 27 -2"
        fill="none"
        stroke="#fffef8"
        strokeWidth="1.85"
        strokeLinecap="round"
        opacity=".8"
      />
      {/* faint ink lines peeking on lower paper face */}
      <g stroke="#7d5838" strokeWidth="1.05" strokeLinecap="round" opacity=".15" fill="none">
        <path d="M-21 8 Q-12 10 -3 7" />
        <path d="M-18 14 Q-10 16 -4 14" />
      </g>
      {/* gentle creases */}
      <g fill="none" stroke={palette.line} strokeWidth="1.2" strokeLinecap="round" opacity=".52">
        <path d="M-30 -2 L-14 4 L-5 16 L-3 30" />
        <path d="M5 -22 L12 -14 L19 -17" />
        <path d="M10 10 L18 16 L24 22" />
      </g>
      <g fill="none" stroke="#fffef7" strokeWidth="1.5" strokeLinecap="round" opacity=".62">
        <path d="M-9 -27 L4 -30 L14 -25" />
        <path d="M-26 -1 L-14 3" />
      </g>
    </g>
  );
}
