/** Static hand-journal decorations for the wish house scene. Presentation only. */

export function NoteCard() {
  return (
    <svg viewBox="0 0 220 230" aria-hidden="true" className="wish-note-svg">
      <g transform="rotate(-3 110 115)">
        <path d="M14 26 L206 20 L212 208 L18 216 Z" fill="#fbeed2" stroke="#e8d3ac" strokeWidth="1.6" />
        <path d="M14 26 L206 20 L212 208 L18 216 Z" fill="url(#wish-note-shade)" opacity=".5" />
        <defs>
          <linearGradient id="wish-note-shade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff8e6" /><stop offset="1" stopColor="#f0dcb4" />
          </linearGradient>
        </defs>
        <path d="M20 202 Q112 208 205 197 L212 208 L18 216 Z" fill="#d5b88b" opacity=".16" />
        <path d="M185 207 Q200 202 208 191 L212 208 Z" fill="#fff9e8" opacity=".7" />
        <g stroke="#c4a77c" strokeWidth=".7" opacity=".16"><path d="M27 43 Q91 40 154 38 M30 183 Q102 180 179 176 M34 192 Q110 188 182 185" /></g>
        <rect x="86" y="8" width="52" height="18" rx="2" fill="#e9d9a8" opacity=".9" transform="rotate(2 112 17)" />
        <g fill="#7c5c3e" fontFamily="'KaiTi','Songti SC',serif" fontSize="19">
          <text x="34" y="66">一个一个小愿望，</text>
          <text x="40" y="98">像一颗颗种子，</text>
          <text x="36" y="130">在日常的时光里</text>
          <text x="40" y="162">慢慢发芽。♡</text>
        </g>
        <g transform="translate(168 178) scale(.8)" fill="#a8c47a" stroke="#7d9c50" strokeWidth="1.6">
          <path d="M0 20 C-2 6 -14 -2 -22 2 C-18 14 -8 20 0 20 Z" />
          <path d="M0 20 C2 6 14 -2 22 2 C18 14 8 20 0 20 Z" />
          <path d="M0 20 V30" fill="none" />
        </g>
      </g>
    </svg>
  );
}

export function StandingBooks() {
  return (
    <svg viewBox="0 0 130 170" aria-hidden="true">
      <g stroke="#8f5c30" strokeWidth="2" strokeLinejoin="round">
        <rect x="8" y="30" width="26" height="132" rx="3" fill="#9dbb6a" />
        <rect x="38" y="14" width="30" height="148" rx="3" fill="#f3e3bd" />
        <rect x="72" y="40" width="24" height="122" rx="3" fill="#e0a35c" transform="rotate(6 84 101)" />
      </g>
      <g stroke="#fff8e6" strokeWidth="2" opacity=".8">
        <path d="M14 48 H28 M14 130 H28" /><path d="M44 34 H62 M44 140 H62" />
      </g>
      <path d="M48 60 h12 v34 h-12 Z" fill="#c9a25e" opacity=".6" />
      <ellipse cx="65" cy="164" rx="60" ry="6" fill="#8f5c30" opacity=".2" />
    </svg>
  );
}

export function LyingBooks() {
  return (
    <svg viewBox="0 0 190 100" aria-hidden="true">
      <ellipse cx="95" cy="92" rx="88" ry="7" fill="#8f5c30" opacity=".22" />
      <g stroke="#8f5c30" strokeWidth="2" strokeLinejoin="round">
        <rect x="14" y="58" width="164" height="30" rx="5" fill="#e2b25c" />
        <rect x="24" y="30" width="150" height="28" rx="5" fill="#9dbb6a" transform="rotate(-2 99 44)" />
      </g>
      <rect x="20" y="64" width="152" height="6" fill="#fff3d6" opacity=".85" />
      <rect x="32" y="36" width="134" height="5" fill="#fff3d6" opacity=".85" transform="rotate(-2 99 44)" />
      <path d="M150 58 v30" stroke="#b0763f" strokeWidth="3" />
      <path d="M40 30 l10 -12 l10 12" fill="#d98a5f" stroke="#8f5c30" strokeWidth="1.6" transform="rotate(-2 99 44)" />
    </svg>
  );
}

export function TeaCup() {
  return (
    <svg viewBox="0 0 150 170" aria-hidden="true">
      <g className="wish-steam" fill="none" stroke="#d8c6ae" strokeWidth="3" strokeLinecap="round" opacity=".7">
        <path d="M62 44 C56 34 68 28 62 16" />
        <path d="M82 48 C76 36 88 30 82 18" />
      </g>
      <ellipse cx="75" cy="150" rx="56" ry="12" fill="#c98d5a" stroke="#a96f3f" strokeWidth="2" />
      <ellipse cx="75" cy="146" rx="56" ry="12" fill="#d9a468" stroke="#a96f3f" strokeWidth="2" />
      <path d="M40 70 C38 108 46 132 75 134 C104 132 112 108 110 70 Z" fill="#fdf6ea" stroke="#d9c3a4" strokeWidth="2.4" />
      <path d="M110 78 C128 76 134 92 124 104 C118 111 110 110 106 104" fill="none" stroke="#d9c3a4" strokeWidth="6" />
      <ellipse cx="75" cy="70" rx="35" ry="9" fill="#f3e6d0" stroke="#d9c3a4" strokeWidth="2.4" />
      <ellipse cx="75" cy="70" rx="27" ry="6" fill="#e0b26a" opacity=".8" />
      <g transform="translate(75 104) scale(.5)" fill="#9dbb6a" stroke="#7d9c50" strokeWidth="2.4">
        <path d="M0 -2 C-3 -16 -18 -17 -18 -6 C-18 2 -7 4 0 -2 Z" />
        <path d="M0 -2 C3 -16 18 -17 18 -6 C18 2 7 4 0 -2 Z" />
        <path d="M0 -2 C-9 7 -7 19 0 19 C7 19 9 7 0 -2 Z" />
        <path d="M0 16 v10" fill="none" />
      </g>
      <path d="M48 84 C46 104 50 120 60 126" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

export function Daisies() {
  return (
    <svg viewBox="0 0 130 100" aria-hidden="true">
      <g fill="none" stroke="#7d9c50" strokeWidth="2.4">
        <path d="M30 96 C36 70 44 56 52 40" /><path d="M70 96 C70 72 76 58 84 44" /><path d="M96 96 C98 78 104 66 112 56" />
      </g>
      <g fill="#a8c47a" stroke="#7d9c50" strokeWidth="1.4">
        <path d="M40 74 Q24 68 26 52 Q42 58 40 74 Z" />
        <path d="M74 78 Q90 72 88 56 Q72 62 74 78 Z" />
        <path d="M100 82 Q86 78 88 64 Q102 68 100 82 Z" />
      </g>
      {[[52, 34], [86, 38], [114, 50]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g fill="#fffdf4" stroke="#e5d3ae" strokeWidth="1">
            {[0, 60, 120, 180, 240, 300].map((a) => <ellipse key={a} cx="0" cy="-8" rx="4" ry="7.5" transform={`rotate(${a})`} />)}
          </g>
          <circle r="4.4" fill="#e9b451" />
        </g>
      ))}
    </svg>
  );
}

export function CornerLeaves() {
  return (
    <svg viewBox="0 0 240 190" aria-hidden="true" className="wish-corner-leaves">
      <g fill="none" stroke="#7d9c50" strokeWidth="3.6" strokeLinecap="round">
        <path d="M242 2 C190 22 142 38 92 82" />
        <path d="M244 40 C204 56 168 78 136 118" />
        <path d="M198 18 C184 46 178 68 182 100" />
        <path d="M162 46 C150 72 148 92 154 118" />
      </g>
      <g fill="#a8c47a" stroke="#719247" strokeWidth="1.6">
        <path d="M176 26 Q152 12 138 32 Q158 50 176 26 Z" />
        <path d="M136 52 Q110 40 98 62 Q120 78 136 52 Z" />
        <path d="M100 78 Q72 68 62 92 Q86 108 100 78 Z" />
        <path d="M72 102 Q48 98 42 122 Q68 132 72 102 Z" />
        <path d="M190 62 Q166 54 158 76 Q182 90 190 62 Z" />
        <path d="M160 100 Q136 96 130 118 Q156 130 160 100 Z" />
        <path d="M196 100 Q184 124 204 138 Q220 118 196 100 Z" />
        <path d="M132 132 Q118 154 138 168 Q154 148 132 132 Z" />
        <path d="M178 142 Q166 164 186 178 Q202 158 178 142 Z" />
      </g>
      <g fill="#c3d996" stroke="#8ba763" strokeWidth="1.4">
        <path d="M214 12 Q198 -6 178 4 Q194 24 214 12 Z" />
        <path d="M150 36 Q138 16 118 22 Q130 44 150 36 Z" />
        <path d="M218 58 Q206 40 186 48 Q200 68 218 58 Z" />
        <path d="M118 96 Q108 76 88 82 Q100 104 118 96 Z" />
        <path d="M92 126 Q82 108 64 114 Q76 134 92 126 Z" />
        <path d="M212 112 Q202 94 184 100 Q196 120 212 112 Z" />
      </g>
      <g fill="none" stroke="#5e7c43" strokeWidth="1" opacity=".4">
        <path d="M176 29 Q154 28 142 33 M136 55 Q114 48 102 63 M100 81 Q78 76 66 93 M190 65 Q170 60 162 77 M160 103 Q140 99 133 119 M214 15 Q196 4 182 5 M150 39 Q136 28 122 24 M118 99 Q102 90 92 84" />
      </g>
    </svg>
  );
}

export function BoardSprig() {
  return (
    <svg viewBox="0 0 90 70" aria-hidden="true">
      <path d="M10 64 C34 48 56 34 80 12" fill="none" stroke="#7d9c50" strokeWidth="2.4" />
      <g fill="#a8c47a" stroke="#7d9c50" strokeWidth="1.4">
        <path d="M34 48 Q18 44 20 28 Q36 34 34 48 Z" />
        <path d="M52 36 Q40 24 50 10 Q64 20 52 36 Z" />
        <path d="M68 24 Q70 6 86 8 Q82 24 68 24 Z" />
        <path d="M44 52 Q56 44 66 52 Q56 64 44 52 Z" />
      </g>
    </svg>
  );
}

export function PencilMark() {
  return (
    <svg viewBox="0 0 34 34" aria-hidden="true" className="wish-pencil">
      <g transform="rotate(45 17 17)">
        <rect x="13" y="4" width="8" height="20" rx="1.5" fill="#e9b451" stroke="#b0763f" strokeWidth="1.4" />
        <rect x="13" y="4" width="8" height="4" fill="#e2938d" stroke="#b0763f" strokeWidth="1.4" />
        <path d="M13 24 L17 31 L21 24 Z" fill="#f7e3bd" stroke="#b0763f" strokeWidth="1.4" />
        <path d="M15.6 28.6 L17 31 L18.4 28.6 Z" fill="#6b4a2f" />
      </g>
    </svg>
  );
}
