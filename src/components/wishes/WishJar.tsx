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

function starPoints(radius: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.48;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

/** Tactile crumpled stationery paper ball (纸团) with faceted folds and warm sunlit edges. */
function PaperBall({ palette }: { palette: BallPalette }) {
  return (
    <g>
      <ellipse cx="0" cy="34" rx="33" ry="8" fill="#8f5d32" opacity=".18" />
      {/* crumpled paper silhouette */}
      <path
        d="M-36 -6 L-31 -23 L-16 -35 L3 -38 L22 -32 L34 -19 L38 -2 L33 17 L21 30 L2 35 L-18 32 L-32 20 L-38 5 Z"
        fill={palette.base}
        stroke={palette.line}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {/* sunlit upper-left paper facets */}
      <path d="M-31 -23 L-16 -35 L3 -38 L-4 -14 L-22 -9 Z" fill={palette.light} opacity=".88" />
      <path d="M3 -38 L22 -32 L14 -12 L-4 -14 Z" fill={palette.light} opacity=".62" />
      <path d="M-36 -6 L-31 -23 L-22 -9 L-14 6 L-32 20 L-38 5 Z" fill={palette.light} opacity=".45" />
      {/* warm shaded lower-right facets */}
      <path d="M14 -12 L34 -19 L38 -2 L19 10 L4 2 Z" fill={palette.dark} opacity=".22" />
      <path d="M4 2 L19 10 L33 17 L21 30 L2 35 L-6 18 Z" fill={palette.dark} opacity=".34" />
      <path d="M-32 20 L-14 6 L-6 18 L2 35 L-18 32 Z" fill={palette.dark} opacity=".24" />
      {/* crisp paper fold creases */}
      <g fill="none" stroke={palette.line} strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" opacity=".52">
        <path d="M-22 -9 L-4 -14 L14 -12 L27 -24" />
        <path d="M-4 -14 L4 2 L19 10 L34 14" />
        <path d="M-22 -9 L-14 6 L-6 18 L2 35" />
        <path d="M-14 6 L4 2" />
        <path d="M-16 -35 L-12 -19 M22 -32 L14 -12 M19 10 L21 30" />
      </g>
      {/* crisp fold ridge highlights */}
      <g fill="none" stroke="#fffef8" strokeWidth="1.6" strokeLinecap="round" opacity=".62">
        <path d="M-24 -22 L-14 -28 L-4 -27" />
        <path d="M-21 -8 L-5 -12" />
        <path d="M6 -11 L15 -10" />
        <path d="M-12 7 L2 3" />
      </g>
    </g>
  );
}

function WishStarShape({ delay }: { delay?: number }) {
  return (
    <g>
      <circle
        className="wish-star-glow"
        style={delay === undefined ? undefined : { animationDelay: `${delay}s` }}
        r="54"
        fill="url(#wish-glow)"
      />
      <g
        className="wish-star-bob"
        style={delay === undefined ? undefined : { animationDelay: `${delay}s` }}
      >
        <polygon points={starPoints(31)} fill="url(#wish-star)" stroke="#e49d24" strokeWidth="4.8" strokeLinejoin="round" />
        <polygon points={starPoints(22)} fill="url(#wish-star-inner)" opacity=".86" />
        <path d="M-8 -13 L-2 -19 L3 -14" fill="none" stroke="#fffef2" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" opacity=".95" />
      </g>
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
  const outerScallops = Array.from({ length: 32 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 32;
    const cx = 230 + Math.cos(a) * 184;
    const cy = 582 + Math.sin(a) * 30;
    return (
      <g key={i}>
        <circle cx={cx.toFixed(1)} cy={cy.toFixed(1)} r="8.2" fill="#fff8ec" stroke="#e4cda9" strokeWidth=".9" />
        <circle cx={(230 + Math.cos(a) * 173).toFixed(1)} cy={(582 + Math.sin(a) * 26.5).toFixed(1)} r="1.8" fill="#d9ba8f" opacity=".55" />
      </g>
    );
  });
  return (
    <g>
      {/* soft warm shadow cast onto wooden table */}
      <ellipse cx="230" cy="588" rx="198" ry="34" fill="#8f5a2c" opacity=".22" />
      {outerScallops}
      <ellipse cx="230" cy="582" rx="182" ry="29.5" fill="#fff8ed" stroke="#e6d1b0" strokeWidth="1.1" />
      <ellipse cx="230" cy="582" rx="160" ry="25" fill="none" stroke="#dfc49c" strokeWidth="1.4" strokeDasharray="3.5 4.5" />
      <ellipse cx="230" cy="582" rx="138" ry="20.5" fill="#faeedb" stroke="#ead5b5" strokeWidth="1" />
      <ellipse cx="230" cy="580" rx="122" ry="17" fill="#9c6a3b" opacity=".16" />
    </g>
  );
}

const JAR_BODY =
  "M116 212 C112 232 110 246 116 260 C78 296 62 346 62 406 C62 480 96 540 150 558 C180 568 280 568 310 558 C364 540 398 480 398 406 C398 346 382 296 344 260 C350 246 348 232 344 212 A114 24 0 0 1 116 212 Z";

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
    start: from ? { x: from.slot.x, y: from.slot.y } : { x: 230, y: 208 },
    to: target
      ? { x: target.slot.x, y: target.slot.y, scale: target.scale, rotation: target.rotation }
      : { x: 238, y: 74, scale: 0.65, rotation: -8 },
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
        "--rise-mid-x": `${activeRise.start.x + (activeRise.to.x - activeRise.start.x) * 0.42 + 16}px`,
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
      viewBox="0 0 460 640"
      role="img"
      aria-label={`玻璃许愿杯：共 ${pending.length} 个未完成愿望，杯中显示 ${ballLayout.length} 个纸团；共 ${completed.length} 个已完成愿望，空中显示 ${starLayout.length} 颗星星`}
      className="wish-jar-svg"
    >
      <defs>
        <linearGradient id="wish-glass-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".56" />
          <stop offset=".16" stopColor="#fffaf0" stopOpacity=".14" />
          <stop offset=".5" stopColor="#fff8ea" stopOpacity=".06" />
          <stop offset=".84" stopColor="#fffaf0" stopOpacity=".18" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".52" />
        </linearGradient>
        <linearGradient id="wish-glass-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".24" />
          <stop offset=".3" stopColor="#ffffff" stopOpacity=".02" />
          <stop offset=".76" stopColor="#fffaf0" stopOpacity=".06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".3" />
        </linearGradient>
        <linearGradient id="wish-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset=".6" stopColor="#f5e6d0" stopOpacity=".72" />
          <stop offset="1" stopColor="#d8bf9e" stopOpacity=".58" />
        </linearGradient>
        <radialGradient id="wish-mouth" cx=".5" cy=".45" r=".65">
          <stop offset="0" stopColor="#ebd4b4" stopOpacity=".46" />
          <stop offset=".68" stopColor="#f6e6cd" stopOpacity=".4" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".66" />
        </radialGradient>
        <radialGradient id="wish-star" cx=".38" cy=".32" r=".78">
          <stop offset="0" stopColor="#fffef0" />
          <stop offset=".45" stopColor="#ffe36e" />
          <stop offset="1" stopColor="#f3b029" />
        </radialGradient>
        <radialGradient id="wish-star-inner" cx=".35" cy=".3" r=".7">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".95" />
          <stop offset="1" stopColor="#ffe88c" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="wish-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffdf7a" stopOpacity=".96" />
          <stop offset=".52" stopColor="#ffe38a" stopOpacity=".42" />
          <stop offset="1" stopColor="#ffe38a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wish-rope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfb274" />
          <stop offset=".5" stopColor="#ca9556" />
          <stop offset="1" stopColor="#ae783d" />
        </linearGradient>
        <linearGradient id="wish-tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff7e2" />
          <stop offset=".55" stopColor="#f8e8c6" />
          <stop offset="1" stopColor="#efd7ab" />
        </linearGradient>
        <filter id="wish-soft" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
        <filter id="wish-soft-2" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" />
        </filter>
        <clipPath id="wish-jar-clip">
          <path d={JAR_BODY} />
        </clipPath>
      </defs>

      <LaceDoily />

      {/* back glass wall */}
      <path d={JAR_BODY} fill="url(#wish-glass-edge)" stroke="#c5ab8e" strokeWidth="2.8" strokeOpacity=".86" />
      <path d={JAR_BODY} fill="#fff9ed" opacity=".1" />
      <path
        d="M122 272 C92 315 76 368 82 426 C87 474 108 518 146 544 M338 271 C372 320 385 372 378 428 C372 476 352 516 318 542"
        fill="none"
        stroke="#a7815b"
        strokeWidth="6.5"
        opacity=".12"
        filter="url(#wish-soft)"
      />

      {/* interior floor & paper balls */}
      <g clipPath="url(#wish-jar-clip)">
        <ellipse cx="230" cy="542" rx="146" ry="24" fill="#b4804a" opacity=".16" />
        {ballLayout.map((ball) => (
          <g
            key={ball.wish.id}
            data-wish-id={ball.wish.id}
            data-wish-kind="ball"
            transform={`translate(${ball.slot.x} ${ball.slot.y}) rotate(${ball.rotation}) scale(${ball.scale})`}
          >
            <PaperBall palette={ball.palette} />
          </g>
        ))}
        {pending.length === 0 && completed.length === 0 && (
          <ellipse cx="230" cy="500" rx="116" ry="38" fill="#fff8e4" opacity=".24" />
        )}
      </g>

      {/* front glass refraction veil, specular ribbons & thick glass base */}
      <path d={JAR_BODY} fill="url(#wish-glass-front)" />
      <g clipPath="url(#wish-jar-clip)">
        <path
          className="wish-jar-shimmer"
          d="M120 278 C94 316 84 358 86 410 C88 458 106 502 134 530"
          fill="none"
          stroke="#ffffff"
          strokeWidth="15"
          strokeLinecap="round"
          opacity=".68"
          filter="url(#wish-soft)"
        />
        <path
          d="M136 292 C117 326 110 362 112 408"
          fill="none"
          stroke="#ffffff"
          strokeWidth="4.6"
          strokeLinecap="round"
          opacity=".85"
          filter="url(#wish-soft-2)"
        />
        <path
          d="M348 282 C370 318 378 358 376 406 C374 448 362 486 340 516"
          fill="none"
          stroke="#ffffff"
          strokeWidth="8.5"
          strokeLinecap="round"
          opacity=".52"
          filter="url(#wish-soft)"
        />
        <path d="M150 554 C180 564 280 564 310 554 L310 568 L150 568 Z" fill="#ffffff" opacity=".34" />
        <ellipse cx="230" cy="552" rx="114" ry="12" fill="#ffffff" opacity=".26" />
        <path d="M164 306 L184 286 M172 322 L196 298" stroke="#ffffff" strokeWidth="3.8" strokeLinecap="round" opacity=".56" />
      </g>
      <path d={JAR_BODY} fill="none" stroke="#ffffff" strokeWidth="2.2" strokeOpacity=".8" />
      <path d="M140 542 Q230 580 320 542 M152 551 Q230 576 308 551" fill="none" stroke="#a6815c" strokeWidth="3.6" opacity=".24" />
      <path d="M152 554 Q230 572 308 554" fill="none" stroke="#fffbf0" strokeWidth="3" opacity=".72" />

      {/* thick double-walled luminous glass rim */}
      <ellipse cx="230" cy="219" rx="116" ry="25" fill="none" stroke="#cdb69a" strokeWidth="2.4" opacity=".52" />
      <ellipse cx="230" cy="212" rx="116" ry="25" fill="url(#wish-rim)" stroke="#cbb498" strokeWidth="2" />
      <ellipse cx="230" cy="212" rx="99" ry="18.5" fill="url(#wish-mouth)" />
      <path d="M134 208 A96 16 0 0 1 326 208" fill="none" stroke="#d1b593" strokeWidth="3.2" opacity=".48" />
      <path d="M136 216 A94 14.5 0 0 0 324 216" fill="none" stroke="#b59472" strokeWidth="2.6" opacity=".32" />
      <ellipse cx="230" cy="212" rx="99" ry="18.5" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity=".86" />
      <path d="M124 206 A108 20 0 0 1 336 206" fill="none" stroke="#ffffff" strokeWidth="3.2" strokeLinecap="round" opacity=".9" />

      {/* braided hemp twine, 2-loop bow and tilted kraft tag */}
      <g>
        {/* shadow under rope */}
        <path d="M118 267 C162 285 298 285 342 267" fill="none" stroke="#8a5a2d" strokeWidth="10" strokeLinecap="round" opacity=".16" />
        <path d="M118 263 C162 281 298 281 342 263" fill="none" stroke="url(#wish-rope)" strokeWidth="9" strokeLinecap="round" />
        <path d="M118 263 C162 281 298 281 342 263" fill="none" stroke="#86592d" strokeWidth="9" strokeDasharray="2.5 5.5" opacity=".36" />
        <path d="M120 259 C164 276 296 276 340 259" fill="none" stroke="#f3d8a8" strokeWidth="2" opacity=".78" />
        {/* tied bow loops */}
        <path d="M342 264 C358 246 382 246 384 261 C385 274 364 278 348 268" fill="none" stroke="url(#wish-rope)" strokeWidth="6.5" strokeLinecap="round" />
        <path d="M342 264 C324 252 308 258 312 271 C316 282 332 279 342 268" fill="none" stroke="url(#wish-rope)" strokeWidth="6.5" strokeLinecap="round" />
        {/* bow hanging tails */}
        <path d="M346 270 C340 288 344 304 350 318" fill="none" stroke="#c38e50" strokeWidth="3.4" strokeLinecap="round" />
        <path d="M352 269 C362 286 368 302 370 318" fill="none" stroke="#b98346" strokeWidth="3.2" strokeLinecap="round" />
        <circle cx="347" cy="266" r="6.8" fill="#ca9556" stroke="#9e6d36" strokeWidth="1.5" />
        {/* kraft paper tag */}
        <g transform="translate(373 360) rotate(10) scale(1.1)">
          {/* tag shadow */}
          <path d="M-31 -43 L35 -39 L37 46 L-29 48 Z" fill="#8b5a2f" opacity=".16" />
          <path d="M-34 -46 L34 -42 L36 44 L-32 46 Z" fill="url(#wish-tag)" stroke="#d9b787" strokeWidth="1.6" strokeLinejoin="round" />
          {/* brass eyelet & string */}
          <circle cx="0" cy="-34" r="4.6" fill="#d8a85c" stroke="#9f7236" strokeWidth="1.2" />
          <circle cx="0" cy="-34" r="2.2" fill="#f2dfc2" />
          <path d="M-2 -37 C-3 -48 0 -55 4 -58" fill="none" stroke="#c38e50" strokeWidth="2.4" strokeLinecap="round" />
          <text x="0" y="-6" textAnchor="middle" fontSize="16.5" fill="#705032" fontFamily="'KaiTi','STKaiti','Songti SC',serif" fontWeight="600">
            我的
          </text>
          <text x="0" y="16" textAnchor="middle" fontSize="16.5" fill="#705032" fontFamily="'KaiTi','STKaiti','Songti SC',serif" fontWeight="600">
            小愿望
          </text>
          <g transform="translate(0 32) scale(.35)" fill="#96b863" stroke="#6d8f40" strokeWidth="2">
            <path d="M0 -2 C-12 -4 -17 -18 -6 -18 C2 -18 4 -7 -2 0 Z" transform="rotate(-12)" />
            <path d="M0 -2 C12 -4 17 -18 6 -18 C-2 -18 -4 -7 2 0 Z" transform="rotate(12)" />
            <path d="M0 2 C-12 4 -17 18 -6 18 C2 18 4 7 -2 0 Z" transform="rotate(12)" />
            <path d="M0 2 C12 4 17 18 6 18 C-2 18 -4 7 2 0 Z" transform="rotate(-12)" />
          </g>
        </g>
      </g>

      {/* completed wishes: warm stars rising from the mouth */}
      {starLayout.length > 0 && (
        <g>
          {/* stardust dotted arcs rising from the jar mouth */}
          <path d="M232 198 C242 162 226 128 238 96" fill="none" stroke="#f7cf6a" strokeWidth="2.6" strokeDasharray="1 7" strokeLinecap="round" opacity=".88" />
          <path d="M254 200 C276 172 288 156 300 138" fill="none" stroke="#f7cf6a" strokeWidth="2.2" strokeDasharray="1 7" strokeLinecap="round" opacity=".76" />
          <path d="M208 200 C192 174 178 158 168 142" fill="none" stroke="#f7cf6a" strokeWidth="2.2" strokeDasharray="1 7" strokeLinecap="round" opacity=".76" />
          {starLayout.map((star) =>
            star.wish.id === hiddenStarId ? null : (
              <WishStar
                key={star.wish.id}
                wishId={star.wish.id}
                x={star.slot.x}
                y={star.slot.y}
                s={star.scale}
                r={star.rotation}
                delay={star.delay}
              />
            ),
          )}
          {/* crisp 4-point sparkles */}
          <g className="wish-sparkle" fill="#fff7cc" stroke="#f2be46" strokeWidth="1" strokeLinejoin="round">
            <path d="M364 106 L367 115 L376 118 L367 121 L364 130 L361 121 L352 118 L361 115 Z" />
            <path d="M108 148 L110 155 L117 157 L110 159 L108 166 L106 159 L99 157 L106 155 Z" />
            <path d="M294 36 L296 42 L302 44 L296 46 L294 52 L292 46 L286 44 L292 42 Z" />
          </g>
          {/* subtle motion lines & golden motes */}
          <g stroke="#f2c14e" strokeWidth="2.2" strokeLinecap="round" opacity=".82">
            <path d="M388 134 L398 128 M392 146 L404 146 M386 158 L396 164" />
          </g>
          <g fill="#f7cf6f">
            <circle cx="348" cy="176" r="2.6" />
            <circle cx="132" cy="108" r="2.2" />
            <circle cx="192" cy="54" r="2.4" />
            <circle cx="382" cy="166" r="2" />
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
