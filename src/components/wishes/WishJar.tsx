"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { WishCelebrationSignal } from "@/application/wishTypes";
import type { WishView } from "./wishView";
import {
  assignBallSlots,
  assignStarSlots,
  type BallLayoutItem,
  type BallPalette,
  type StarLayoutItem,
} from "./wishLayout";

function starPoints(radius: number, innerRatio = 0.5) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * innerRatio;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

function PaperBall({ palette }: { palette: BallPalette }) {
  return (
    <g>
      <ellipse cx="0" cy="37" rx="33" ry="7" fill="#8a5d35" opacity=".14" />
      <path
        d="M0 -40 L24 -33 L40 -12 L38 14 L22 33 L-2 40 L-26 31 L-40 10 L-38 -14 L-22 -33 Z"
        fill={palette.base}
        stroke={palette.line}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeOpacity=".5"
      />
      <path d="M0 -40 L-22 -33 L-38 -14 L-12 -10 L10 -18 Z" fill={palette.light} opacity=".92" />
      <path d="M0 -40 L10 -18 L24 -33 Z" fill={palette.base} />
      <path d="M-12 -10 L10 -18 L20 4 L-2 12 L-20 4 Z" fill={palette.light} opacity=".7" />
      <path d="M24 -33 L40 -12 L38 14 L20 4 L10 -18 Z" fill={palette.base} />
      <path d="M38 14 L22 33 L-2 12 L20 4 Z" fill={palette.dark} opacity=".5" />
      <path d="M22 33 L-2 40 L-26 31 L-20 12 L-2 12 Z" fill={palette.base} />
      <path d="M-26 31 L-40 10 L-38 -14 L-20 4 L-20 12 Z" fill={palette.dark} opacity=".4" />
      <path d="M-38 -14 L-12 -10 L-20 4 Z" fill={palette.base} opacity=".92" />
      <path d="M-2 12 L20 4 L38 14 L22 33 L-2 40 L-26 31 L-20 12 Z" fill={palette.dark} opacity=".1" />
      <path
        d="M0 -40 L-22 -33 L-38 -14 L-12 -10 L10 -18 Z"
        fill="none"
        stroke="#fffdf4"
        strokeWidth="2.2"
        opacity=".55"
        strokeLinejoin="round"
      />
      <g fill="none" stroke={palette.line} strokeWidth="1.2" opacity=".4" strokeLinecap="round">
        <path d="M-12 -10 L10 -18 M-12 -10 L-20 4 M-20 4 L-38 -14 M-20 4 L-20 12 M-20 12 L-26 31 M-20 12 L-2 12 M10 -18 L24 -33 M10 -18 L20 4 M20 4 L38 14 M20 4 L-2 12 M-2 12 L22 33 M-2 12 L-2 40" />
      </g>
      <path d="M-30 -20 Q-20 -33 -6 -34" fill="none" stroke="#fffdf4" strokeWidth="2.6" opacity=".6" strokeLinecap="round" />
    </g>
  );
}

function WishStarShape({ delay }: { delay?: number }) {
  return (
    <g>
      <circle className="wish-star-glow" style={delay === undefined ? undefined : { animationDelay: `${delay}s` }} r="58" fill="url(#wish-glow)" />
      <polygon points={starPoints(34)} fill="url(#wish-star)" stroke="#efb941" strokeWidth="7" strokeLinejoin="round" />
      <polygon points={starPoints(23, 0.48)} fill="#fff2bd" opacity=".62" />
      <path d="M-9 -14 L-3 -18" stroke="#fffbe4" strokeWidth="3.4" strokeLinecap="round" opacity=".95" />
      <path d="M13 12 L17 9" stroke="#fffbe4" strokeWidth="2.2" strokeLinecap="round" opacity=".7" />
    </g>
  );
}

function WishStar({ wishId, x, y, s, r, delay }: { wishId: string; x: number; y: number; s: number; r: number; delay: number }) {
  return (
    <g data-wish-id={wishId} data-wish-kind="star" transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <WishStarShape delay={delay} />
    </g>
  );
}

function LaceDoily() {
  const scallops = Array.from({ length: 40 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 40;
    return <circle key={i} cx={(230 + Math.cos(a) * 196).toFixed(1)} cy={(586 + Math.sin(a) * 34).toFixed(1)} r="7.5" fill="#fff8ec" stroke="#ecd9bd" strokeWidth=".8" />;
  });
  return (
    <g>
      <ellipse cx="230" cy="592" rx="206" ry="37" fill="#b98a55" opacity=".2" />
      {scallops}
      <ellipse cx="230" cy="586" rx="196" ry="34" fill="#fff8ec" stroke="#ecd9bd" strokeWidth="1" />
      <ellipse cx="230" cy="586" rx="164" ry="26" fill="none" stroke="#e5cfae" strokeWidth="1.4" strokeDasharray="3 5" />
      <ellipse cx="230" cy="586" rx="126" ry="19" fill="#f7ecd9" opacity=".8" />
      <ellipse cx="230" cy="583" rx="138" ry="20" fill="#c49a67" opacity=".12" />
      <g fill="#fffdf6" opacity=".8">
        <circle cx="98" cy="574" r="2.4" /><circle cx="152" cy="606" r="2" /><circle cx="286" cy="610" r="2.2" /><circle cx="362" cy="572" r="2.4" />
      </g>
    </g>
  );
}

const JAR_BODY = "M70 200 C62 232 60 252 72 272 C42 322 34 382 44 436 C58 516 132 556 230 560 C328 556 402 516 416 436 C426 382 418 322 388 272 C400 252 398 232 390 200 A160 30 0 0 0 70 200 Z";

interface ActiveRise {
  nonce: number;
  wishId: string;
  from: BallLayoutItem | null;
  start: { x: number; y: number };
  to: { x: number; y: number; scale: number; rotation: number };
  toVisible: boolean;
}

function deriveActiveRise(
  celebration: WishCelebrationSignal | null,
  pending: WishView[],
  completed: WishView[],
  starLayout: StarLayoutItem[],
  reducedMotion: boolean,
  finishedNonce: number,
): ActiveRise | null {
  if (!celebration || reducedMotion || celebration.nonce === finishedNonce) return null;
  const completedWish = completed.find((wish) => wish.id === celebration.wishId);
  if (!completedWish) return null;
  // Rebuilding the pending list with the completed wish restores the exact ball
  // layout that was on screen before this persisted completion.
  const previousPending: WishView[] = [
    ...pending,
    { ...completedWish, status: "pending", completedAt: null },
  ];
  const from = assignBallSlots(previousPending).find((item) => item.wish.id === celebration.wishId) ?? null;
  const target = starLayout.find((item) => item.wish.id === celebration.wishId) ?? null;
  return {
    nonce: celebration.nonce,
    wishId: celebration.wishId,
    from,
    // A capped-out wish has no visible ball; rise from the mouth instead of borrowing another ball.
    start: from ? { x: from.slot.x, y: from.slot.y } : { x: 230, y: 200 },
    to: target
      ? { x: target.slot.x, y: target.slot.y, scale: target.scale, rotation: target.rotation }
      : { x: 246, y: 185, scale: 0.62, rotation: -8 },
    toVisible: target !== null,
  };
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Presentation-only glass wish jar. Every visible paper ball maps to one real
 * pending wish id and every visible star maps to one real completed wish id.
 * Completion motion is a transient overlay after persistence; it never writes.
 */
export function WishJar({
  pending,
  completed,
  celebration,
}: {
  pending: WishView[];
  completed: WishView[];
  celebration: WishCelebrationSignal | null;
}) {
  const reducedMotion = useReducedMotion();
  const ballLayout = assignBallSlots(pending);
  const starLayout = assignStarSlots(completed);
  const [finishedNonce, setFinishedNonce] = useState(0);
  const activeRise = deriveActiveRise(celebration, pending, completed, starLayout, reducedMotion, finishedNonce);

  useEffect(() => {
    if (!activeRise) return;
    // animationend 正常结束动画；该定时器防止动画事件缺失时留下半完成覆盖层。
    const timer = window.setTimeout(() => setFinishedNonce(activeRise.nonce), 2000);
    return () => window.clearTimeout(timer);
  }, [activeRise]);

  const hiddenStarId = activeRise?.toVisible ? activeRise.wishId : null;
  const riseStyle = activeRise
    ? ({
        "--rise-from-x": `${activeRise.start.x}px`,
        "--rise-from-y": `${activeRise.start.y}px`,
        "--rise-mid-x": `${activeRise.start.x + (activeRise.to.x - activeRise.start.x) * 0.42 + 18}px`,
        "--rise-mid-y": `${activeRise.start.y + (activeRise.to.y - activeRise.start.y) * 0.52}px`,
        "--rise-to-x": `${activeRise.to.x}px`,
        "--rise-to-y": `${activeRise.to.y}px`,
      } as CSSProperties)
    : undefined;
  const ballStyle = activeRise?.from
    ? ({
        "--ball-start-scale": `${activeRise.from.scale}`,
        "--ball-mid-scale": `${activeRise.from.scale * 0.6}`,
        "--ball-end-scale": `${activeRise.from.scale * 0.28}`,
        "--ball-start-rotate": `${activeRise.from.rotation}deg`,
        "--ball-end-rotate": `${activeRise.from.rotation + 40}deg`,
      } as CSSProperties)
    : undefined;
  const starStyle = activeRise
    ? ({
        "--star-end-scale": `${activeRise.to.scale}`,
        "--star-start-rotate": `${activeRise.to.rotation}deg`,
        "--star-end-rotate": `${activeRise.to.rotation + 20}deg`,
      } as CSSProperties)
    : undefined;

  return (
    <svg
      viewBox="30 20 420 575"
      role="img"
      aria-label={`玻璃许愿杯：共 ${pending.length} 个未完成愿望，杯中显示 ${ballLayout.length} 个纸团；共 ${completed.length} 个已完成愿望，空中显示 ${starLayout.length} 颗星星`}
      className="wish-jar-svg"
    >
      <defs>
        <linearGradient id="wish-glass-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".6" />
          <stop offset=".14" stopColor="#ffffff" stopOpacity=".14" />
          <stop offset=".5" stopColor="#fff6e6" stopOpacity=".08" />
          <stop offset=".86" stopColor="#ffffff" stopOpacity=".2" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".55" />
        </linearGradient>
        <linearGradient id="wish-glass-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".24" />
          <stop offset=".28" stopColor="#ffffff" stopOpacity=".025" />
          <stop offset=".76" stopColor="#ffffff" stopOpacity=".07" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="wish-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".96" />
          <stop offset=".55" stopColor="#fdf7ec" stopOpacity=".72" />
          <stop offset="1" stopColor="#d8c5ad" stopOpacity=".55" />
        </linearGradient>
        <radialGradient id="wish-mouth" cx=".5" cy=".5" r=".66">
          <stop offset="0" stopColor="#ad9276" stopOpacity=".62" />
          <stop offset=".72" stopColor="#d5bfa2" stopOpacity=".4" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".72" />
        </radialGradient>
        <radialGradient id="wish-star" cx=".38" cy=".32" r=".82">
          <stop offset="0" stopColor="#fff8cf" />
          <stop offset=".52" stopColor="#ffd96f" />
          <stop offset="1" stopColor="#f2b23a" />
        </radialGradient>
        <radialGradient id="wish-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffeaa8" stopOpacity=".9" />
          <stop offset=".58" stopColor="#ffe9a8" stopOpacity=".32" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wish-rope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0b47a" />
          <stop offset="1" stopColor="#b8834a" />
        </linearGradient>
        <linearGradient id="wish-tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff8e2" />
          <stop offset="1" stopColor="#f3ddb2" />
        </linearGradient>
        <filter id="wish-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.2" /></filter>
        <filter id="wish-soft-2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <clipPath id="wish-jar-clip"><path d={JAR_BODY} /></clipPath>
      </defs>

      <LaceDoily />

      {/* back wall of the glass */}
      <path d={JAR_BODY} fill="url(#wish-glass-edge)" stroke="#a98f74" strokeWidth="3.6" strokeOpacity=".88" />
      <path d={JAR_BODY} fill="#fff8ec" opacity=".12" />
      <path d="M82 286 C58 334 52 390 60 442 C68 486 88 522 118 546 M382 282 C408 332 414 388 406 442 C398 484 378 518 346 542" fill="none" stroke="#95775b" strokeWidth="9" opacity=".12" filter="url(#wish-soft)" />

      <g clipPath="url(#wish-jar-clip)">
        <ellipse cx="230" cy="542" rx="160" ry="26" fill="#b98a55" opacity=".15" />
        {ballLayout.map((ball) => (
          <g key={ball.wish.id} data-wish-id={ball.wish.id} data-wish-kind="ball" transform={`translate(${ball.slot.x} ${ball.slot.y}) rotate(${ball.rotation}) scale(${ball.scale})`}>
            <PaperBall palette={ball.palette} />
          </g>
        ))}
        {pending.length === 0 && completed.length === 0 && <ellipse cx="230" cy="500" rx="130" ry="42" fill="#fff6e0" opacity=".22" />}
      </g>

      {/* front glass: refraction veil, highlights and thick base */}
      <path d={JAR_BODY} fill="url(#wish-glass-front)" />
      <g clipPath="url(#wish-jar-clip)">
        <path d="M78 292 C60 338 54 392 62 444 C68 484 84 518 112 542" fill="none" stroke="#ffffff" strokeWidth="22" strokeLinecap="round" opacity=".72" filter="url(#wish-soft)" />
        <path d="M96 304 C82 348 78 394 86 440" fill="none" stroke="#ffffff" strokeWidth="6.5" strokeLinecap="round" opacity=".92" filter="url(#wish-soft-2)" />
        <path d="M390 288 C410 336 416 390 408 442 C402 482 386 512 358 534" fill="none" stroke="#ffffff" strokeWidth="12" strokeLinecap="round" opacity=".56" filter="url(#wish-soft)" />
        <path d="M386 318 C396 360 398 402 392 436" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".55" />
        <path d="M124 548 C168 566 292 566 336 548 L336 570 L124 570 Z" fill="#ffffff" opacity=".4" />
        <ellipse cx="230" cy="550" rx="132" ry="15" fill="#ffffff" opacity=".3" />
        <path d="M112 538 C150 562 310 562 348 538" fill="none" stroke="#fffef8" strokeWidth="4" strokeLinecap="round" opacity=".85" />
        <path d="M146 330 L166 310 M154 348 L180 322" stroke="#ffffff" strokeWidth="4.4" strokeLinecap="round" opacity=".5" />
        <path d="M312 352 L326 338" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" opacity=".4" />
      </g>
      <path d={JAR_BODY} fill="none" stroke="#ffffff" strokeWidth="2.4" strokeOpacity=".78" />
      <path d="M120 540 Q230 582 340 540 M136 552 Q230 578 324 552" fill="none" stroke="#a9896c" strokeWidth="4" opacity=".24" />
      <path d="M140 556 Q230 580 320 556" fill="none" stroke="#fff9ea" strokeWidth="3.2" opacity=".68" />

      {/* wide thick glass rim */}
      <ellipse cx="230" cy="207" rx="160" ry="30" fill="none" stroke="#cbb79e" strokeWidth="2.4" opacity=".5" />
      <ellipse cx="230" cy="200" rx="161" ry="30" fill="url(#wish-rim)" stroke="#c9b69f" strokeWidth="2.2" />
      <ellipse cx="230" cy="200" rx="141" ry="23" fill="url(#wish-mouth)" />
      <path d="M70 196 A160 30 0 0 1 390 196" fill="none" stroke="#ffffff" strokeWidth="3.6" strokeLinecap="round" opacity=".85" />
      <path d="M82 207 A150 25 0 0 0 378 207" fill="none" stroke="#b49a7d" strokeWidth="3.2" opacity=".35" />
      <ellipse cx="230" cy="200" rx="141" ry="23" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity=".8" />

      {/* rope, bow and paper tag */}
      <g>
        <path d="M64 262 C142 286 318 286 396 262" fill="none" stroke="url(#wish-rope)" strokeWidth="10" strokeLinecap="round" />
        <path d="M64 262 C142 286 318 286 396 262" fill="none" stroke="#8a5f33" strokeWidth="10" strokeDasharray="2.5 6.5" opacity=".32" />
        <path d="M66 257 C144 281 316 281 394 257" fill="none" stroke="#f0d3a0" strokeWidth="2.4" opacity=".72" />
        <path d="M394 265 C412 248 432 250 434 266 C435 280 416 284 402 273" fill="none" stroke="url(#wish-rope)" strokeWidth="7.4" strokeLinecap="round" />
        <path d="M398 269 C390 287 400 300 416 298 C430 296 430 278 412 272" fill="none" stroke="url(#wish-rope)" strokeWidth="7.4" strokeLinecap="round" />
        <circle cx="400" cy="268" r="6.8" fill="#c89a62" stroke="#a97a42" strokeWidth="1.5" />
        <path d="M402 274 C398 294 384 320 372 344" fill="none" stroke="#c89a62" strokeWidth="3.2" strokeLinecap="round" />
        <g transform="translate(360 394) rotate(7) scale(1.26)">
          <path d="M-36 -48 L36 -44 L38 46 L-34 48 Z" fill="url(#wish-tag)" stroke="#d9b98c" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M-36 -48 L36 -44 L38 46 L-34 48 Z" fill="none" stroke="#fff8e6" strokeWidth=".8" opacity=".7" />
          <circle cx="0" cy="-35" r="3.5" fill="#b98a55" />
          <path d="M-4 -48 C-2 -55 2 -55 4 -48" fill="none" stroke="#c89a62" strokeWidth="2.5" />
          <text x="0" y="-6" textAnchor="middle" fontSize="19" fill="#7a5a3a" fontFamily="'KaiTi','Songti SC',serif">我的</text>
          <text x="0" y="19" textAnchor="middle" fontSize="19" fill="#7a5a3a" fontFamily="'KaiTi','Songti SC',serif">小愿望</text>
          <g transform="translate(0 35) scale(.38)" fill="#9dbb6a" stroke="#7d9c50" strokeWidth="2">
            <path d="M0 -2 C-3 -14 -16 -15 -16 -6 C-16 1 -6 3 0 -2 Z" />
            <path d="M0 -2 C3 -14 16 -15 16 -6 C16 1 6 3 0 -2 Z" />
            <path d="M0 -2 C-8 6 -6 16 0 16 C6 16 8 6 0 -2 Z" />
          </g>
        </g>
      </g>

      {/* completed wishes: warm stars drifting above the mouth */}
      {starLayout.length > 0 && (
        <g>
          <path d="M232 186 C244 158 236 146 246 124" fill="none" stroke="#f7cf6f" strokeWidth="2.6" strokeDasharray="1 7" strokeLinecap="round" opacity=".9" />
          <path d="M258 190 C284 176 302 182 322 176" fill="none" stroke="#f7cf6f" strokeWidth="2.2" strokeDasharray="1 7" strokeLinecap="round" opacity=".72" />
          <path d="M204 190 C178 178 156 184 136 186" fill="none" stroke="#f7cf6f" strokeWidth="2.2" strokeDasharray="1 7" strokeLinecap="round" opacity=".72" />
          {starLayout.map((star) =>
            star.wish.id === hiddenStarId ? null : (
              <WishStar key={star.wish.id} wishId={star.wish.id} x={star.slot.x} y={star.slot.y} s={star.scale} r={star.rotation} delay={star.delay} />
            ),
          )}
          <g stroke="#f2c14e" strokeWidth="2.6" strokeLinecap="round" opacity=".92">
            <path d="M368 118 v15 M360.5 125.5 h15" />
            <path d="M96 148 v11 M90.5 153.5 h11" />
            <path d="M286 78 v11 M280.5 83.5 h11" />
          </g>
          <g fill="#f7cf6f">
            <circle cx="352" cy="170" r="2.8" /><circle cx="126" cy="112" r="2.3" /><circle cx="208" cy="72" r="2.6" /><circle cx="390" cy="146" r="2.2" /><circle cx="176" cy="152" r="1.9" />
          </g>
        </g>
      )}

      {/* transient completion motion: paper ball rises and becomes a warm star */}
      {activeRise && (
        <g
          key={activeRise.nonce}
          className="wish-rise"
          style={riseStyle}
          aria-hidden="true"
          data-wish-id={activeRise.wishId}
          data-wish-kind="rise"
          onAnimationEnd={(event) => {
            if (event.target === event.currentTarget) setFinishedNonce(activeRise.nonce);
          }}
        >
          {activeRise.from && (
            <g className="wish-rise-ball" style={ballStyle}>
              <PaperBall palette={activeRise.from.palette} />
            </g>
          )}
          <g className={activeRise.toVisible ? "wish-rise-star" : "wish-rise-star ephemeral"} style={starStyle}>
            <WishStarShape />
          </g>
        </g>
      )}
    </svg>
  );
}
