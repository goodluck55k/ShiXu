import { MAX_VISIBLE_BALLS, MAX_VISIBLE_STARS } from "./wishView";

type BallPalette = { base: string; light: string; dark: string; line: string };

const PALETTES: Record<string, BallPalette> = {
  pink: { base: "#f2bdb6", light: "#fae0db", dark: "#dd8f86", line: "#c97c74" },
  green: { base: "#c8dc9e", light: "#e7f1cd", dark: "#99b871", line: "#82a058" },
  cream: { base: "#f7ebcf", light: "#fdf8e9", dark: "#e0c99f", line: "#c9ad7f" },
  peach: { base: "#f6d9b4", light: "#fdeed8", dark: "#e5b988", line: "#cba06c" },
  yellow: { base: "#f6df9f", light: "#fcf0cd", dark: "#e6c47e", line: "#cfa961" },
};

// Fixed composition slots (candidate layout, subject to visual review).
const BALL_SLOTS = [
  { x: 150, y: 488, s: 1.22, r: -8, p: "pink" },
  { x: 238, y: 512, s: 1.28, r: 6, p: "cream" },
  { x: 316, y: 484, s: 1.16, r: -14, p: "green" },
  { x: 180, y: 420, s: 1.1, r: 12, p: "green" },
  { x: 272, y: 428, s: 1.12, r: -5, p: "pink" },
  { x: 340, y: 428, s: 0.95, r: 18, p: "peach" },
  { x: 128, y: 430, s: 0.88, r: 20, p: "peach" },
  { x: 226, y: 368, s: 0.95, r: -10, p: "yellow" },
];

const STAR_SLOTS = [
  { x: 240, y: 58, s: 1.0, r: -12 },
  { x: 156, y: 116, s: 0.72, r: 14 },
  { x: 314, y: 122, s: 0.8, r: -20 },
  { x: 116, y: 50, s: 0.5, r: 8 },
  { x: 338, y: 42, s: 0.55, r: -6 },
];

function starPoints(radius: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? radius : radius * 0.46;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push(`${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`);
  }
  return pts.join(" ");
}

function PaperBall({ palette }: { palette: BallPalette }) {
  return (
    <g>
      <ellipse cx="0" cy="34" rx="34" ry="8" fill="#a97c4e" opacity=".16" />
      <path d="M-37 -8 Q-40 -20 -29 -27 Q-25 -38 -12 -36 Q-3 -43 8 -37 Q22 -39 28 -29 Q39 -25 37 -13 Q43 -3 36 7 Q38 19 27 25 Q20 36 8 34 Q-2 41 -13 34 Q-26 36 -30 25 Q-40 20 -36 9 Q-42 1 -37 -8 Z" fill={palette.base} stroke={palette.line} strokeWidth="1.2" strokeOpacity=".55" />
      <path d="M-33 7 Q-28 22 -17 25 Q-4 35 8 29 Q23 31 33 12 Q29 31 8 34 Q-2 41 -13 34 Q-29 35 -33 24 Z" fill={palette.dark} opacity=".28" />
      <path d="M-30 -18 Q-22 -34 -9 -30 Q1 -37 13 -29 Q24 -30 29 -19 Q18 -24 9 -17 Q-5 -24 -14 -15 Q-24 -20 -30 -18 Z" fill={palette.light} opacity=".7" />
      <path d="M-29 -13 Q-18 -9 -15 0 Q-9 -5 -3 -3 M-15 0 Q-22 8 -19 17 M-4 -26 Q-1 -17 7 -14 Q3 -8 8 -3 M23 -20 Q18 -12 22 -6 Q15 -2 16 5 M-8 24 Q-1 18 1 11 Q8 15 14 12 M27 7 Q21 10 20 18" fill="none" stroke={palette.line} strokeWidth="1.25" opacity=".46" strokeLinecap="round" />
      <path d="M-25 -23 Q-18 -28 -11 -25 M-9 3 Q-3 0 2 3 M12 -22 Q17 -24 21 -20 M-13 20 Q-8 17 -5 19" fill="none" stroke="#fffdf4" strokeWidth="2" opacity=".55" strokeLinecap="round" />
    </g>
  );
}

function WishStar({ x, y, s, r, delay }: { x: number; y: number; s: number; r: number; delay: number }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(${r}) scale(${s})`}>
      <circle className="wish-star-glow" style={{ animationDelay: `${delay}s` }} r="46" fill="url(#wish-glow)" />
      <polygon points={starPoints(30)} fill="url(#wish-star)" stroke="#f2bd45" strokeWidth="5" strokeLinejoin="round" />
      <polygon points={starPoints(19)} fill="#fff3c4" opacity=".55" />
      <path d="M-7 -12 L-2 -16" stroke="#fffbe0" strokeWidth="3" strokeLinecap="round" opacity=".9" />
    </g>
  );
}

function LaceDoily() {
  const scallops = Array.from({ length: 36 }, (_, i) => {
    const a = (Math.PI * 2 * i) / 36;
    return <circle key={i} cx={(230 + Math.cos(a) * 186).toFixed(1)} cy={(584 + Math.sin(a) * 31).toFixed(1)} r="7.5" fill="#fff6e8" stroke="#ecd9bd" strokeWidth=".8" />;
  });
  return (
    <g>
      <ellipse cx="230" cy="588" rx="196" ry="34" fill="#c99b62" opacity=".18" />
      {scallops}
      <ellipse cx="230" cy="584" rx="186" ry="31" fill="#fff6e8" stroke="#ecd9bd" strokeWidth="1" />
      <ellipse cx="230" cy="584" rx="156" ry="24" fill="none" stroke="#e5cfae" strokeWidth="1.4" strokeDasharray="3 5" />
      <ellipse cx="230" cy="584" rx="120" ry="17" fill="#f6ead6" opacity=".7" />
      <ellipse cx="230" cy="582" rx="132" ry="18" fill="#b98a55" opacity=".14" />
    </g>
  );
}

const JAR_BODY = "M112 190 C108 214 106 228 112 244 C76 280 60 330 60 392 C60 470 96 536 150 556 C180 566 280 566 310 556 C364 536 400 470 400 392 C400 330 384 280 348 244 C354 228 352 214 348 190 A118 26 0 0 1 112 190 Z";

/** Presentation-only glass wish jar: pending wishes are paper balls inside, completed wishes are stars above. */
export function WishJar({ pending, completed }: { pending: number; completed: number }) {
  const balls = BALL_SLOTS.slice(0, Math.min(pending, MAX_VISIBLE_BALLS));
  const stars = STAR_SLOTS.slice(0, Math.min(completed, MAX_VISIBLE_STARS));
  return (
    <svg viewBox="0 0 460 640" role="img" aria-label={`玻璃许愿杯：${pending} 个未完成愿望纸团，${completed} 颗已完成愿望星星`} className="wish-jar-svg">
      <defs>
        <linearGradient id="wish-glass-edge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".52" />
          <stop offset=".16" stopColor="#ffffff" stopOpacity=".1" />
          <stop offset=".5" stopColor="#fff6e6" stopOpacity=".07" />
          <stop offset=".84" stopColor="#ffffff" stopOpacity=".16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".5" />
        </linearGradient>
        <linearGradient id="wish-glass-front" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".2" />
          <stop offset=".3" stopColor="#ffffff" stopOpacity=".02" />
          <stop offset=".78" stopColor="#ffffff" stopOpacity=".06" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".26" />
        </linearGradient>
        <linearGradient id="wish-rim" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".92" />
          <stop offset="1" stopColor="#d9c9b6" stopOpacity=".55" />
        </linearGradient>
        <radialGradient id="wish-mouth" cx=".5" cy=".5" r=".65">
          <stop offset="0" stopColor="#b79c80" stopOpacity=".65" />
          <stop offset=".75" stopColor="#d9c3a6" stopOpacity=".45" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".6" />
        </radialGradient>
        <radialGradient id="wish-star" cx=".4" cy=".35" r=".8">
          <stop offset="0" stopColor="#fff6c9" />
          <stop offset=".55" stopColor="#ffd76e" />
          <stop offset="1" stopColor="#f5b93f" />
        </radialGradient>
        <radialGradient id="wish-glow" cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#ffe9a8" stopOpacity=".85" />
          <stop offset=".6" stopColor="#ffe9a8" stopOpacity=".3" />
          <stop offset="1" stopColor="#ffe9a8" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wish-rope" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#d8ab6e" />
          <stop offset="1" stopColor="#b9854a" />
        </linearGradient>
        <linearGradient id="wish-tag" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fbf0d6" />
          <stop offset="1" stopColor="#f3dfb8" />
        </linearGradient>
        <filter id="wish-soft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3" /></filter>
        <filter id="wish-soft-2" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <clipPath id="wish-jar-clip"><path d={JAR_BODY} /></clipPath>
      </defs>

      <LaceDoily />

      {/* back wall of the glass */}
      <path d={JAR_BODY} fill="url(#wish-glass-edge)" stroke="#bfae97" strokeWidth="3" strokeOpacity=".9" />
      <path d={JAR_BODY} fill="#fff8ec" opacity=".14" />
      <path d="M119 256 C88 301 73 356 80 416 C85 466 105 513 144 542 M341 255 C376 307 389 360 380 420 C374 470 355 511 320 539" fill="none" stroke="#997b60" strokeWidth="7" opacity=".13" filter="url(#wish-soft)" />

      <g clipPath="url(#wish-jar-clip)">
        <ellipse cx="230" cy="540" rx="150" ry="26" fill="#b98a55" opacity=".16" />
        {balls.map((b, i) => (
          <g key={i} transform={`translate(${b.x} ${b.y}) rotate(${b.r}) scale(${b.s})`}>
            <PaperBall palette={PALETTES[b.p]} />
          </g>
        ))}
        {pending === 0 && completed === 0 && <ellipse cx="230" cy="500" rx="120" ry="40" fill="#fff6e0" opacity=".22" />}
      </g>

      {/* front glass: refraction veil, highlights and thick base */}
      <path d={JAR_BODY} fill="url(#wish-glass-front)" />
      <g clipPath="url(#wish-jar-clip)">
        <path d="M118 262 C92 302 82 342 84 396 C86 448 104 498 132 528" fill="none" stroke="#ffffff" strokeWidth="16" strokeLinecap="round" opacity=".65" filter="url(#wish-soft)" />
        <path d="M136 276 C116 312 108 348 110 396" fill="none" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity=".8" filter="url(#wish-soft-2)" />
        <path d="M352 268 C374 306 382 348 380 398 C378 442 366 486 344 516" fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" opacity=".5" filter="url(#wish-soft)" />
        <path d="M150 552 C180 562 280 562 310 552 L310 566 L150 566 Z" fill="#ffffff" opacity=".3" />
        <ellipse cx="230" cy="550" rx="116" ry="13" fill="#ffffff" opacity=".22" />
        <path d="M168 300 L186 282 M176 316 L200 292" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity=".5" />
      </g>
      <path d={JAR_BODY} fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity=".75" />
      <path d="M138 539 Q230 579 322 539 M151 549 Q230 575 309 549" fill="none" stroke="#a9896c" strokeWidth="4" opacity=".25" />
      <path d="M152 552 Q230 570 308 552" fill="none" stroke="#fff9ea" strokeWidth="3" opacity=".65" />

      {/* thick glass rim */}
      <ellipse cx="230" cy="197" rx="120" ry="27" fill="none" stroke="#cbb79e" strokeWidth="2.4" opacity=".55" />
      <ellipse cx="230" cy="190" rx="120" ry="27" fill="url(#wish-rim)" stroke="#c9b69f" strokeWidth="2" />
      <ellipse cx="230" cy="190" rx="103" ry="20" fill="url(#wish-mouth)" />
      <path d="M130 186 A100 18 0 0 1 330 186" fill="none" stroke="#c9b193" strokeWidth="4" opacity=".5" />
      <path d="M132 194 A98 16 0 0 0 328 194" fill="none" stroke="#a98f74" strokeWidth="3" opacity=".35" />
      <ellipse cx="230" cy="190" rx="103" ry="20" fill="none" stroke="#ffffff" strokeWidth="2" strokeOpacity=".8" />
      <path d="M120 184 A112 22 0 0 1 340 184" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" opacity=".85" />

      {/* rope, bow and paper tag */}
      <g>
        <path d="M114 248 C160 266 300 266 346 248" fill="none" stroke="url(#wish-rope)" strokeWidth="9" strokeLinecap="round" />
        <path d="M114 248 C160 266 300 266 346 248" fill="none" stroke="#8a5f33" strokeWidth="9" strokeDasharray="2.5 6" opacity=".35" />
        <path d="M116 244 C162 261 298 261 344 244" fill="none" stroke="#f0d3a0" strokeWidth="2" opacity=".7" />
        <path d="M346 250 C362 236 380 238 382 252 C383 264 366 268 352 258" fill="none" stroke="url(#wish-rope)" strokeWidth="7" strokeLinecap="round" />
        <path d="M350 254 C344 270 352 282 366 280 C378 278 378 262 362 256" fill="none" stroke="url(#wish-rope)" strokeWidth="7" strokeLinecap="round" />
        <circle cx="352" cy="253" r="6.5" fill="#c89a62" stroke="#a97a42" strokeWidth="1.5" />
        <path d="M356 258 C362 274 366 288 368 302" fill="none" stroke="#c89a62" strokeWidth="3" strokeLinecap="round" />
        <g transform="translate(374 352) rotate(7) scale(1.12)">
          <path d="M-34 -46 L34 -42 L36 44 L-32 46 Z" fill="url(#wish-tag)" stroke="#d9b98c" strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="0" cy="-34" r="3.4" fill="#b98a55" />
          <path d="M-4 -46 C-2 -52 2 -52 4 -46" fill="none" stroke="#c89a62" strokeWidth="2.4" />
          <text x="0" y="-6" textAnchor="middle" fontSize="17" fill="#7a5a3a" fontFamily="'KaiTi','Songti SC',serif">我的</text>
          <text x="0" y="17" textAnchor="middle" fontSize="17" fill="#7a5a3a" fontFamily="'KaiTi','Songti SC',serif">小愿望</text>
          <g transform="translate(0 32) scale(.34)" fill="#9dbb6a" stroke="#7d9c50" strokeWidth="2">
            <path d="M0 -2 C-3 -14 -16 -15 -16 -6 C-16 1 -6 3 0 -2 Z" />
            <path d="M0 -2 C3 -14 16 -15 16 -6 C16 1 6 3 0 -2 Z" />
            <path d="M0 -2 C-8 6 -6 16 0 16 C6 16 8 6 0 -2 Z" />
          </g>
        </g>
      </g>

      {/* completed wishes: warm stars rising from the mouth */}
      {stars.length > 0 && (
        <g>
          <path d="M232 176 C242 142 226 112 240 86" fill="none" stroke="#f7cf6f" strokeWidth="2.6" strokeDasharray="1 7" strokeLinecap="round" opacity=".85" />
          <path d="M252 178 C278 156 292 148 306 140" fill="none" stroke="#f7cf6f" strokeWidth="2.2" strokeDasharray="1 7" strokeLinecap="round" opacity=".7" />
          <path d="M212 178 C196 158 178 146 166 136" fill="none" stroke="#f7cf6f" strokeWidth="2.2" strokeDasharray="1 7" strokeLinecap="round" opacity=".7" />
          {stars.map((s, i) => <WishStar key={i} {...s} delay={i * 0.7} />)}
          <g stroke="#f2c14e" strokeWidth="2.4" strokeLinecap="round" opacity=".9">
            <path d="M368 108 v14 M361 115 h14" />
            <path d="M104 150 v10 M99 155 h10" />
            <path d="M282 34 v10 M277 39 h10" />
          </g>
          <g fill="#f7cf6f">
            <circle cx="352" cy="170" r="2.6" /><circle cx="128" cy="104" r="2.2" /><circle cx="206" cy="40" r="2.4" /><circle cx="388" cy="140" r="2" />
          </g>
        </g>
      )}
    </svg>
  );
}
