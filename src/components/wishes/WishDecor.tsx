/** Static hand-journal decorations for the wish house scene. Presentation only. */

export function NoteCard() {
  return (
    <svg viewBox="0 0 220 230" aria-hidden="true" className="wish-note-svg">
      <defs>
        <linearGradient id="wish-note-shade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".6" stopColor="#f9ebd0" />
          <stop offset="1" stopColor="#efd8b2" />
        </linearGradient>
        <linearGradient id="wish-note-tape" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ead6a8" />
          <stop offset=".5" stopColor="#f3e2bb" />
          <stop offset="1" stopColor="#e5cf9e" />
        </linearGradient>
      </defs>
      <g transform="rotate(-3 110 115)">
        {/* soft drop shadow */}
        <path d="M16 30 L208 24 L214 212 L20 220 Z" fill="#8b5a34" opacity=".16" />
        {/* paper body */}
        <path d="M14 26 L206 20 L212 208 L18 216 Z" fill="url(#wish-note-shade)" stroke="#e4cca3" strokeWidth="1.5" strokeLinejoin="round" />
        {/* subtle paper fold & lifted corner */}
        <path d="M20 202 Q112 208 205 197 L212 208 L18 216 Z" fill="#d3b282" opacity=".16" />
        <path d="M184 208 Q200 202 209 190 L212 208 Z" fill="#fffaf0" opacity=".8" />
        {/* masking tape */}
        <path d="M84 10 L138 7 L140 25 L86 27 Z" fill="url(#wish-note-tape)" opacity=".92" stroke="#d5bc8a" strokeWidth=".8" />
        <g fill="#7d5c3c" fontFamily="'KaiTi','STKaiti','Songti SC',serif" fontSize="17.5" letterSpacing="0.03em">
          <text x="34" y="66">一个个小愿望，</text>
          <text x="40" y="99">像一颗颗种子，</text>
          <text x="36" y="132">在日常的时光里</text>
          <text x="40" y="165">慢慢发芽。♡</text>
        </g>
        <g transform="translate(170 176) scale(.86)" fill="#a5c26b" stroke="#749445" strokeWidth="1.5">
          <path d="M0 20 C-2 6 -14 -2 -22 2 C-18 14 -8 20 0 20 Z" />
          <path d="M0 20 C2 6 14 -2 22 2 C18 14 8 20 0 20 Z" />
          <path d="M0 20 V30" fill="none" strokeLinecap="round" />
        </g>
      </g>
    </svg>
  );
}

export function StandingBooks() {
  return (
    <svg viewBox="0 0 160 185" aria-hidden="true">
      {/* table shadow */}
      <ellipse cx="78" cy="175" rx="70" ry="8" fill="#7a4c28" opacity=".22" />
      {/* standing books on far left */}
      <g stroke="#8a5a30" strokeWidth="2" strokeLinejoin="round">
        <rect x="8" y="34" width="26" height="136" rx="3.5" fill="#9fb96a" />
        <rect x="38" y="16" width="30" height="154" rx="3.5" fill="#f3e2bc" />
        <rect x="70" y="50" width="22" height="120" rx="3.5" fill="#d9a562" transform="rotate(4 81 110)" />
      </g>
      <g stroke="#fff9eb" strokeWidth="2" opacity=".75">
        <path d="M14 52 H28 M14 138 H28" />
        <path d="M44 36 H62 M44 146 H62" />
      </g>
      <rect x="47" y="64" width="12" height="34" rx="1.5" fill="#c79d58" opacity=".55" />
      {/* small stacked cream wooden blocks beside the books */}
      <g stroke="#a37243" strokeWidth="1.6" strokeLinejoin="round">
        <rect x="100" y="132" width="44" height="38" rx="4" fill="#f0d8a8" />
        <rect x="104" y="100" width="36" height="32" rx="4" fill="#f7e6c0" />
      </g>
      <line x1="106" y1="106" x2="134" y2="106" stroke="#fffaf0" strokeWidth="2" opacity=".7" strokeLinecap="round" />
      <line x1="106" y1="138" x2="138" y2="138" stroke="#fffaf0" strokeWidth="2" opacity=".6" strokeLinecap="round" />
      {/* tiny daisy peeking on far left */}
      <g transform="translate(22 146) scale(.75)">
        <path d="M0 24 Q2 10 0 0" stroke="#759445" strokeWidth="2.4" fill="none" />
        <g fill="#fffef8" stroke="#e4d0a6" strokeWidth="1">
          {[0, 60, 120, 180, 240, 300].map((a) => (
            <ellipse key={a} cx="0" cy="-7" rx="3.6" ry="6.5" transform={`rotate(${a})`} />
          ))}
        </g>
        <circle r="3.8" fill="#ebb44d" />
      </g>
    </svg>
  );
}

export function LyingBooks() {
  return (
    <svg viewBox="0 0 210 112" aria-hidden="true">
      <defs>
        <linearGradient id="wish-book-sage" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#b9ce82" />
          <stop offset="1" stopColor="#8fa75a" />
        </linearGradient>
        <linearGradient id="wish-book-terra" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e19c6b" />
          <stop offset="1" stopColor="#c5794d" />
        </linearGradient>
      </defs>
      {/* warm contact shadow */}
      <ellipse cx="105" cy="100" rx="94" ry="9" fill="#734724" opacity=".24" />
      {/* bottom terracotta book */}
      <g stroke="#8a552e" strokeWidth="2" strokeLinejoin="round">
        <path d="M16 64 Q16 58 24 58 H186 Q194 58 194 64 V88 Q194 94 186 94 H24 Q16 94 16 88 Z" fill="url(#wish-book-terra)" />
        <path d="M26 65 H188 V86 H26 Q22 76 26 65 Z" fill="#fdf3dc" stroke="#c89e6b" strokeWidth="1.4" />
      </g>
      <path d="M32 72 H182 M32 79 H182" stroke="#e2cca8" strokeWidth="1.1" />
      {/* top sage green book */}
      <g transform="rotate(-1.8 106 44)">
        <g stroke="#7b5530" strokeWidth="2" strokeLinejoin="round">
          <path d="M24 34 Q24 28 32 28 H184 Q192 28 192 34 V54 Q192 60 184 60 H32 Q24 60 24 54 Z" fill="url(#wish-book-sage)" />
          <path d="M34 35 H186 V53 H34 Q30 44 34 35 Z" fill="#fff7e3" stroke="#b9ad7d" strokeWidth="1.4" />
        </g>
        <path d="M40 42 H180 M40 48 H180" stroke="#e4d6b5" strokeWidth="1" />
        {/* ribbon bookmark */}
        <path d="M52 54 V70 L58 65 L64 70 V54 Z" fill="#e08f6c" stroke="#99563a" strokeWidth="1.2" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

export function TeaCup() {
  return (
    <svg viewBox="0 0 160 175" aria-hidden="true">
      <defs>
        <linearGradient id="wish-mug-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fffaf0" />
          <stop offset=".6" stopColor="#faecd6" />
          <stop offset="1" stopColor="#edd6b5" />
        </linearGradient>
        <linearGradient id="wish-coaster" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#dfa86b" />
          <stop offset="1" stopColor="#bd7f47" />
        </linearGradient>
      </defs>
      {/* gentle steam */}
      <g className="wish-steam" fill="none" stroke="#fff3de" strokeWidth="2.8" strokeLinecap="round" opacity=".75">
        <path d="M64 46 C58 34 72 26 64 14" />
        <path d="M84 50 C78 36 92 28 84 16" />
      </g>
      {/* table shadow & wooden coaster */}
      <ellipse cx="78" cy="156" rx="60" ry="13" fill="#744825" opacity=".24" />
      <ellipse cx="78" cy="150" rx="56" ry="12" fill="#a86e3b" stroke="#8a552a" strokeWidth="1.8" />
      <ellipse cx="78" cy="145" rx="56" ry="12" fill="url(#wish-coaster)" stroke="#9a6234" strokeWidth="1.8" />
      <ellipse cx="78" cy="144" rx="44" ry="8.5" fill="none" stroke="#f0c892" strokeWidth="1.2" opacity=".55" />
      {/* mug handle */}
      <path d="M112 78 C132 76 138 94 126 108 C120 115 111 114 106 108" fill="none" stroke="#e4cba8" strokeWidth="7" strokeLinecap="round" />
      <path d="M113 80 C130 79 134 94 124 105" fill="none" stroke="#fff9ee" strokeWidth="2.4" strokeLinecap="round" opacity=".8" />
      {/* mug body */}
      <path d="M40 70 C38 112 46 138 76 140 C106 138 114 112 112 70 Z" fill="url(#wish-mug-body)" stroke="#d5bc99" strokeWidth="2.2" />
      {/* tea surface & rim */}
      <ellipse cx="76" cy="70" rx="36" ry="9.5" fill="#f7ebda" stroke="#d5bc99" strokeWidth="2.2" />
      <ellipse cx="76" cy="70.5" rx="28" ry="6.2" fill="#d49c54" opacity=".88" />
      <path d="M56 70 A24 5 0 0 1 94 69" fill="none" stroke="#f2cf94" strokeWidth="1.6" opacity=".8" />
      {/* four-leaf clover emblem */}
      <g transform="translate(76 106) scale(.46)" fill="#96b863" stroke="#6f8f42" strokeWidth="2">
        <path d="M0 -2 C-12 -4 -17 -18 -6 -18 C2 -18 4 -7 -2 0 Z" transform="rotate(-12)" />
        <path d="M0 -2 C12 -4 17 -18 6 -18 C-2 -18 -4 -7 2 0 Z" transform="rotate(12)" />
        <path d="M0 2 C-12 4 -17 18 -6 18 C2 18 4 7 -2 0 Z" transform="rotate(12)" />
        <path d="M0 2 C12 4 17 18 6 18 C-2 18 -4 7 2 0 Z" transform="rotate(-12)" />
        <path d="M0 14 Q2 24 6 29" fill="none" strokeLinecap="round" />
      </g>
      {/* ceramic highlight */}
      <path d="M48 84 C46 106 50 122 60 128" fill="none" stroke="#ffffff" strokeWidth="4.2" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

export function Daisies() {
  return (
    <svg viewBox="0 0 135 104" aria-hidden="true">
      <ellipse cx="68" cy="96" rx="48" ry="6" fill="#7c4e2a" opacity=".16" />
      <g fill="none" stroke="#759445" strokeWidth="2.4" strokeLinecap="round">
        <path d="M28 95 C34 70 42 56 50 40" />
        <path d="M68 95 C68 72 74 58 84 42" />
        <path d="M96 95 C98 78 104 66 114 54" />
      </g>
      <g fill="#a5c36d" stroke="#759445" strokeWidth="1.4">
        <path d="M38 74 Q22 68 24 52 Q40 58 38 74 Z" />
        <path d="M72 78 Q88 72 86 56 Q70 62 72 78 Z" />
        <path d="M100 82 Q86 78 88 64 Q102 68 100 82 Z" />
      </g>
      {[[50, 34], [86, 36], [116, 48]].map(([x, y], i) => (
        <g key={i} transform={`translate(${x} ${y})`}>
          <g fill="#fffef7" stroke="#e4d0a6" strokeWidth="1">
            {[0, 60, 120, 180, 240, 300].map((a) => (
              <ellipse key={a} cx="0" cy="-8" rx="4.2" ry="7.6" transform={`rotate(${a})`} />
            ))}
          </g>
          <circle r="4.6" fill="#ebb44d" />
          <circle cx="-1.2" cy="-1.2" r="1.4" fill="#fde39c" />
        </g>
      ))}
    </svg>
  );
}

export function CornerLeaves() {
  return (
    <svg viewBox="0 0 260 185" aria-hidden="true" className="wish-corner-leaves">
      {/* stems sweeping from top-right */}
      <g fill="none" stroke="#7a9947" strokeWidth="3" strokeLinecap="round">
        <path d="M262 6 C210 24 156 44 96 86" />
        <path d="M262 34 C216 56 176 80 138 122" />
        <path d="M196 30 C180 54 168 78 164 108" />
        <path d="M238 16 C230 48 228 82 232 118" />
      </g>
      {/* back sunlit yellow-green leaves */}
      <g fill="#d5e58f" stroke="#97b55f" strokeWidth="1.2">
        <path d="M188 18 Q170 2 152 12 Q166 30 188 18 Z" />
        <path d="M142 42 Q126 24 108 34 Q122 52 142 42 Z" />
        <path d="M214 50 Q198 34 180 44 Q194 64 214 50 Z" />
        <path d="M234 94 Q212 90 206 110 Q228 118 234 94 Z" />
        <path d="M106 80 Q82 72 72 92 Q96 102 106 80 Z" />
      </g>
      {/* front rich olive-sage leaves */}
      <g fill="#a4c268" stroke="#709040" strokeWidth="1.5">
        <path d="M162 34 Q138 22 126 40 Q144 54 162 34 Z" />
        <path d="M124 58 Q98 48 88 68 Q108 82 124 58 Z" />
        <path d="M174 68 Q152 62 144 82 Q166 94 174 68 Z" />
        <path d="M148 102 Q126 98 122 120 Q144 128 148 102 Z" />
        <path d="M166 98 Q158 122 178 134 Q190 112 166 98 Z" />
        <path d="M220 34 Q208 58 224 72 Q242 54 220 34 Z" />
        <path d="M244 64 Q236 90 252 104 Q266 84 244 64 Z" />
      </g>
      {/* soft leaf veins */}
      <g fill="none" stroke="#5b7832" strokeWidth="1" opacity=".42">
        <path d="M160 35 Q144 36 130 40 M122 59 Q106 62 92 67 M172 69 Q158 74 147 81 M147 104 Q134 111 124 118" />
      </g>
    </svg>
  );
}

export function BoardSprig() {
  return (
    <svg viewBox="0 0 90 70" aria-hidden="true">
      <path d="M10 64 C34 48 56 34 80 12" fill="none" stroke="#769646" strokeWidth="2.3" strokeLinecap="round" />
      <g fill="#a6c36c" stroke="#769646" strokeWidth="1.4">
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
        <rect x="13" y="4" width="8" height="20" rx="1.5" fill="#ebb44d" stroke="#a66c35" strokeWidth="1.4" />
        <rect x="13" y="4" width="8" height="4.2" fill="#e2938d" stroke="#a66c35" strokeWidth="1.4" />
        <path d="M13 24 L17 31 L21 24 Z" fill="#f7e3bd" stroke="#a66c35" strokeWidth="1.4" />
        <path d="M15.6 28.6 L17 31 L18.4 28.6 Z" fill="#5e3e24" />
      </g>
    </svg>
  );
}
