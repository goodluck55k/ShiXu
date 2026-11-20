/** Static storybook backdrop: sunlit window, sheer curtain, hanging leaves and warm wooden table. Presentation only. */
export function WishSceneBackdrop() {
  return (
    <svg viewBox="0 0 1400 800" preserveAspectRatio="xMinYMax slice" aria-hidden="true" className="wish-backdrop">
      <defs>
        <linearGradient id="ws-wall" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fae4c6" />
          <stop offset=".48" stopColor="#f0c79c" />
          <stop offset="1" stopColor="#dfaa78" />
        </linearGradient>
        <radialGradient id="ws-wall-glow" cx=".38" cy=".34" r=".58">
          <stop offset="0" stopColor="#fff7e2" stopOpacity=".72" />
          <stop offset=".55" stopColor="#fde7c4" stopOpacity=".28" />
          <stop offset="1" stopColor="#d89d6b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ws-wall-vignette" x1=".65" y1="0" x2="1" y2=".9">
          <stop offset="0" stopColor="#c78b59" stopOpacity="0" />
          <stop offset="1" stopColor="#b27446" stopOpacity=".24" />
        </linearGradient>
        <linearGradient id="ws-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7b678" />
          <stop offset=".35" stopColor="#d99f62" />
          <stop offset=".75" stopColor="#c98b4f" />
          <stop offset="1" stopColor="#b97840" />
        </linearGradient>
        <radialGradient id="ws-table-sun" cx=".36" cy=".28" r=".52">
          <stop offset="0" stopColor="#fff3ca" stopOpacity=".62" />
          <stop offset=".55" stopColor="#ffe1a3" stopOpacity=".28" />
          <stop offset="1" stopColor="#ffe1a3" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="ws-beam" x1="0" y1="0" x2=".55" y2="1">
          <stop offset="0" stopColor="#fff8dc" stopOpacity=".68" />
          <stop offset=".55" stopColor="#fff1c4" stopOpacity=".28" />
          <stop offset="1" stopColor="#fff1c4" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ws-pane" x1="0" y1="0" x2=".3" y2="1">
          <stop offset="0" stopColor="#fffde6" />
          <stop offset=".55" stopColor="#faf0c8" />
          <stop offset="1" stopColor="#eedda8" />
        </linearGradient>
        <linearGradient id="ws-wood-frame" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#d79d64" />
          <stop offset=".5" stopColor="#c58851" />
          <stop offset="1" stopColor="#af723e" />
        </linearGradient>
        <linearGradient id="ws-curtain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff5e0" />
          <stop offset=".28" stopColor="#f8e8ca" />
          <stop offset=".52" stopColor="#fff7e4" />
          <stop offset=".78" stopColor="#efd9b4" />
          <stop offset="1" stopColor="#faebd0" />
        </linearGradient>
        <filter id="ws-bokeh" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="8" />
        </filter>
        <filter id="ws-soft-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.5" />
        </filter>
        <clipPath id="ws-window-clip">
          <rect x="82" y="34" width="538" height="466" rx="8" />
        </clipPath>
      </defs>

      {/* warm sunlit wall */}
      <rect width="1400" height="800" fill="url(#ws-wall)" />
      <rect width="1400" height="800" fill="url(#ws-wall-glow)" />
      <rect width="1400" height="800" fill="url(#ws-wall-vignette)" />

      {/* window outer shadow + wooden casing */}
      <rect x="64" y="20" width="576" height="502" rx="12" fill="#8b552a" opacity=".16" transform="translate(8 6)" />
      <rect x="64" y="18" width="576" height="500" rx="12" fill="url(#ws-wood-frame)" stroke="#9b6233" strokeWidth="3.5" />
      {/* inner reveal depth for storybook perspective */}
      <path d="M82 34 H620 V500 H82 Z" fill="#a86d3b" />

      <g clipPath="url(#ws-window-clip)">
        <rect x="82" y="34" width="538" height="466" fill="url(#ws-pane)" />
        {/* sunlit garden bokeh */}
        <g filter="url(#ws-bokeh)">
          <circle cx="155" cy="100" r="76" fill="#cde399" opacity=".88" />
          <circle cx="295" cy="70" r="56" fill="#dfeea9" opacity=".85" />
          <circle cx="440" cy="126" r="82" fill="#b4d17c" opacity=".72" />
          <circle cx="574" cy="86" r="64" fill="#d4e7a0" opacity=".8" />
          <circle cx="190" cy="276" r="76" fill="#b9d483" opacity=".62" />
          <circle cx="498" cy="296" r="90" fill="#c7df92" opacity=".58" />
          <circle cx="348" cy="396" r="72" fill="#afd079" opacity=".52" />
          <circle cx="122" cy="440" r="60" fill="#d3e6a0" opacity=".56" />
          <ellipse cx="355" cy="195" rx="205" ry="125" fill="#fffdf0" opacity=".68" />
        </g>
        {/* distant leaf silhouettes */}
        <g opacity=".26" fill="#7c9f58" filter="url(#ws-soft-blur)">
          <path d="M108 468 Q142 320 222 225 Q186 338 108 468 M138 368 Q98 336 96 290 Q152 308 138 368 M164 318 Q174 260 226 242 Q222 296 164 318" />
          <path d="M558 478 Q528 320 450 220 Q492 338 558 478 M532 365 Q574 330 578 286 Q522 308 532 365 M506 315 Q494 260 448 240 Q452 290 506 315" />
        </g>
        {/* glass pane reflection streaks */}
        <path d="M82 34 L318 34 L196 500 L82 500 Z" fill="#fffef2" opacity=".32" />
        <path d="M362 34 L428 34 L308 500 L254 500 Z" fill="#fffef4" opacity=".18" />
      </g>

      {/* window inner bevel + muntins */}
      <rect x="82" y="34" width="538" height="466" rx="6" fill="none" stroke="#8f582b" strokeWidth="3" opacity=".45" />
      <g fill="url(#ws-wood-frame)" stroke="#9b6233" strokeWidth="2">
        <rect x="342" y="28" width="18" height="476" />
        <rect x="76" y="182" width="550" height="16" />
        <rect x="76" y="342" width="550" height="16" />
      </g>
      <g stroke="#e9ba83" strokeWidth="1.5" opacity=".75">
        <line x1="344" y1="34" x2="344" y2="498" />
        <line x1="82" y1="184" x2="620" y2="184" />
        <line x1="82" y1="344" x2="620" y2="344" />
      </g>
      {/* sunlit windowsill */}
      <rect x="46" y="502" width="612" height="24" rx="6" fill="#dfb074" stroke="#a66d39" strokeWidth="2" />
      <line x1="52" y1="505" x2="652" y2="505" stroke="#f7d49c" strokeWidth="2.4" opacity=".8" />

      {/* sheer cream curtain draping beside the window */}
      <g>
        <path d="M624 0 C662 110 656 225 676 352 C688 430 676 490 694 532 L808 532 C790 460 804 352 790 232 C778 130 792 54 780 0 Z" fill="#b47949" opacity=".14" filter="url(#ws-soft-blur)" />
        <path d="M618 0 C658 102 648 214 666 336 C678 424 662 486 680 526 L792 526 C772 440 788 332 774 214 C762 114 778 46 766 0 Z" fill="url(#ws-curtain)" />
        <path d="M636 0 Q672 165 668 335 T694 526 L720 526 Q702 360 712 190 T674 0 Z" fill="#fffbf0" opacity=".48" />
        <path d="M726 0 Q754 155 744 335 T764 526 L782 526 Q764 360 774 190 T748 0 Z" fill="#fff9e8" opacity=".32" />
        <g fill="none" stroke="#d5b386" strokeWidth="3" opacity=".68">
          <path d="M620 0 C658 102 648 214 666 336 C678 424 662 486 680 526" />
          <path d="M664 0 C694 114 684 236 700 364 C710 448 698 492 710 526" />
          <path d="M712 0 C738 122 728 248 742 378 C750 456 740 496 752 526" />
        </g>
        <path d="M754 0 C772 128 764 260 778 394 C784 462 776 498 786 526" fill="none" stroke="#caa171" strokeWidth="4" opacity=".4" />
      </g>

      {/* diagonal sunbeams */}
      <path d="M168 38 L610 595 L915 595 L395 28 Z" fill="url(#ws-beam)" opacity=".52" />
      <path d="M380 42 L830 620 L1020 620 L550 32 Z" fill="url(#ws-beam)" opacity=".36" />

      {/* wooden tabletop */}
      <rect x="0" y="502" width="1400" height="298" fill="url(#ws-table)" />
      <rect x="0" y="502" width="1400" height="298" fill="url(#ws-table-sun)" />
      {/* table back edge highlight & shadow */}
      <rect x="0" y="500" width="1400" height="8" fill="#efc387" />
      <rect x="0" y="508" width="1400" height="6" fill="#a86e39" opacity=".18" />

      {/* sunlight pools cast on wood */}
      <path d="M110 512 L420 512 L725 800 L440 800 Z" fill="#fff6d6" opacity=".18" />
      <path d="M445 512 L595 512 L925 800 L775 800 Z" fill="#fff5d0" opacity=".14" />
      <ellipse cx="485" cy="596" rx="340" ry="62" fill="#ffefbe" opacity=".32" />

      {/* wood planks & organic wood grain */}
      <g stroke="#9b6232" strokeWidth="1.8" opacity=".28">
        <path d="M0 568 H1400" />
        <path d="M0 644 H1400" />
        <path d="M0 726 H1400" />
      </g>
      <g stroke="#fff1cc" strokeWidth="1.2" opacity=".24">
        <path d="M0 570 H1400" />
        <path d="M0 646 H1400" />
        <path d="M0 728 H1400" />
      </g>
      <g stroke="#8a5428" strokeWidth="1.4" opacity=".17" fill="none" strokeLinecap="round">
        <path d="M24 536 Q210 526 390 538 T760 535 M820 542 Q1030 530 1240 541 T1400 538" />
        <path d="M45 604 Q280 594 520 606 T960 602 M1020 608 Q1210 598 1390 606" />
        <path d="M15 684 Q270 672 540 684 T1060 682 M1120 688 Q1260 680 1400 686" />
        <path d="M90 762 Q370 750 660 762 T1240 760" />
        <ellipse cx="1038" cy="596" rx="28" ry="7" />
        <ellipse cx="246" cy="688" rx="22" ry="6" />
        <ellipse cx="790" cy="756" rx="18" ry="5" />
      </g>

      {/* hanging sunlit vine leaves in top-left window corner */}
      <g>
        <path d="M-12 -8 C56 38 128 66 218 124" fill="none" stroke="#789848" strokeWidth="4.2" strokeLinecap="round" />
        <path d="M56 22 C86 64 114 104 148 164" fill="none" stroke="#789848" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M126 68 C134 102 150 132 174 166" fill="none" stroke="#85a654" strokeWidth="2.4" strokeLinecap="round" />
        {/* back soft warm leaves */}
        <g fill="#cde192" stroke="#8ba95d" strokeWidth="1.4">
          <path d="M68 38 Q88 16 112 30 Q98 56 68 38 Z" />
          <path d="M128 68 Q152 48 172 64 Q158 88 128 68 Z" />
          <path d="M142 134 Q166 118 184 136 Q166 156 142 134 Z" />
          <path d="M18 44 Q2 66 20 88 Q42 70 18 44 Z" />
        </g>
        {/* front sunlit leaves */}
        <g fill="#a5c46c" stroke="#719143" strokeWidth="1.6">
          <path d="M38 24 Q14 44 32 68 Q56 52 38 24 Z" />
          <path d="M92 48 Q70 74 92 96 Q116 76 92 48 Z" />
          <path d="M150 78 Q132 108 156 126 Q178 102 150 78 Z" />
          <path d="M200 112 Q186 142 212 158 Q230 132 200 112 Z" />
          <path d="M116 110 Q96 134 116 154 Q138 134 116 110 Z" />
        </g>
        <g fill="none" stroke="#5b7a36" strokeWidth="1.1" opacity=".48">
          <path d="M38 28 Q36 48 32 62 M92 52 Q93 72 92 90 M150 82 Q155 104 156 121 M68 38 Q89 35 106 31 M128 68 Q150 67 166 65" />
        </g>
      </g>
    </svg>
  );
}
