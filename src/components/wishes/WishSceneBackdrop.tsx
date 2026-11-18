/** Static storybook backdrop: sunny window, curtain and warm wooden table. Presentation only. */
export function WishSceneBackdrop() {
  return (
    <svg viewBox="0 0 1400 800" preserveAspectRatio="xMinYMax slice" aria-hidden="true" className="wish-backdrop">
      <defs>
        <linearGradient id="ws-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbe5c6" />
          <stop offset=".6" stopColor="#f5d4ab" />
          <stop offset="1" stopColor="#eec296" />
        </linearGradient>
        <linearGradient id="ws-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e7b477" />
          <stop offset=".38" stopColor="#d99d5e" />
          <stop offset=".78" stopColor="#c8864b" />
          <stop offset="1" stopColor="#bd7a41" />
        </linearGradient>
        <linearGradient id="ws-beam" x1="0" y1="0" x2=".72" y2="1">
          <stop offset="0" stopColor="#fff3c6" stopOpacity=".78" />
          <stop offset=".7" stopColor="#ffedb6" stopOpacity=".22" />
          <stop offset="1" stopColor="#ffedb6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ws-pane" x1="0" y1="0" x2=".4" y2="1">
          <stop offset="0" stopColor="#fffbe3" />
          <stop offset=".52" stopColor="#f4f0c4" />
          <stop offset="1" stopColor="#e8e6ae" />
        </linearGradient>
        <linearGradient id="ws-curtain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fffbeb" />
          <stop offset=".55" stopColor="#f8ead0" />
          <stop offset="1" stopColor="#fff8e6" />
        </linearGradient>
        <linearGradient id="ws-foliage" x1="0" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#d9e79c" />
          <stop offset="1" stopColor="#93b465" />
        </linearGradient>
        <radialGradient id="ws-sun" cx=".22" cy=".18" r=".68">
          <stop offset="0" stopColor="#fff8d8" stopOpacity=".9" />
          <stop offset=".55" stopColor="#fff3c2" stopOpacity=".35" />
          <stop offset="1" stopColor="#fff3c2" stopOpacity="0" />
        </radialGradient>
        <filter id="ws-bokeh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="9" /></filter>
        <filter id="ws-soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" /></filter>
        <clipPath id="ws-window-clip"><rect x="55" y="36" width="424" height="500" rx="4" /></clipPath>
      </defs>

      <rect width="1400" height="800" fill="url(#ws-wall)" />
      <rect width="1400" height="800" fill="url(#ws-sun)" />
      <ellipse cx="360" cy="150" rx="520" ry="330" fill="#fff8df" opacity=".4" filter="url(#ws-bokeh)" />

      {/* window frame and sunlit foliage */}
      <rect x="30" y="12" width="474" height="552" rx="9" fill="#c98d5a" stroke="#a96f3f" strokeWidth="4" />
      <rect x="38" y="20" width="458" height="536" rx="6" fill="#e2ae73" />
      <g clipPath="url(#ws-window-clip)">
        <rect x="55" y="36" width="424" height="500" fill="url(#ws-pane)" />
        <g filter="url(#ws-bokeh)">
          <circle cx="104" cy="96" r="66" fill="#c6db8f" opacity=".9" />
          <circle cx="212" cy="64" r="52" fill="#e0ecaa" opacity=".95" />
          <circle cx="332" cy="104" r="72" fill="#a9c778" opacity=".82" />
          <circle cx="440" cy="70" r="54" fill="#cfe2a0" opacity=".88" />
          <circle cx="150" cy="246" r="68" fill="#b7d184" opacity=".55" />
          <circle cx="414" cy="270" r="82" fill="#c6db8f" opacity=".5" />
          <circle cx="268" cy="388" r="72" fill="#a9c778" opacity=".42" />
          <ellipse cx="280" cy="180" rx="190" ry="112" fill="#fffce8" opacity=".62" />
        </g>
        <g fill="#9fbd6d" opacity=".78">
          <path d="M58 92 Q86 44 142 34 Q150 82 108 108 Q78 112 58 92 Z" />
          <path d="M160 60 Q196 26 240 46 Q230 92 186 98 Q168 86 160 60 Z" />
          <path d="M318 54 Q356 20 404 40 Q394 84 348 92 Q328 80 318 54 Z" />
          <path d="M428 122 Q466 92 498 122 Q480 158 442 154 Q430 140 428 122 Z" />
          <path d="M78 188 Q108 160 138 182 Q124 216 92 212 Q80 202 78 188 Z" />
        </g>
        <g fill="#c7d992" opacity=".9">
          <path d="M108 40 Q132 20 160 36 Q150 64 122 62 Q110 54 108 40 Z" />
          <path d="M232 68 Q256 46 282 64 Q270 92 242 86 Q232 78 232 68 Z" />
          <path d="M376 86 Q402 66 426 88 Q412 112 386 106 Q378 98 376 86 Z" />
          <path d="M62 244 Q86 220 110 240 Q98 266 72 260 Q62 254 62 244 Z" />
        </g>
        <g fill="none" stroke="#6f9048" strokeWidth="1.1" opacity=".45">
          <path d="M68 82 Q104 60 136 46 M176 60 Q206 44 232 50 M334 58 Q366 40 396 48 M440 130 Q466 108 490 122 M84 196 Q108 178 132 188 M116 48 Q138 34 154 40" />
        </g>
        <g fill="#8fb165" opacity=".5" filter="url(#ws-soft)">
          <path d="M70 512 Q92 330 198 214 Q168 350 70 512 M122 365 Q76 330 72 270 Q142 306 122 365 M178 290 Q206 214 282 198 Q262 272 178 290" />
          <path d="M466 518 Q420 330 322 210 Q372 360 466 518 M410 372 Q458 330 466 272 Q394 306 410 372 M360 276 Q340 206 268 190 Q292 266 360 276" />
        </g>
        <g fill="url(#ws-foliage)" opacity=".55">
          <path d="M104 342 Q120 250 196 214 Q196 286 104 342 Z" />
          <path d="M340 250 Q408 180 478 196 Q432 262 340 250 Z" />
          <path d="M240 488 Q300 410 362 430 Q320 496 240 488 Z" />
        </g>
        <g fill="#a9c778" opacity=".34">
          <path d="M132 168 Q142 110 194 92 Q192 148 132 168 Z M356 404 Q390 352 438 360 Q412 414 356 404 Z" />
        </g>
        <path d="M55 36 L262 36 L144 536 L55 536 Z" fill="#fffbdc" opacity=".2" />
        <path d="M310 36 L480 36 L480 536 L376 536 Z" fill="#fff3c4" opacity=".14" />
        <g fill="#64853f" opacity=".3">
          <path d="M64 130 Q82 64 146 48 Q134 116 64 130 Z M180 88 Q214 42 274 46 Q248 98 180 88 Z M356 140 Q408 88 470 98 Q438 154 356 140 Z M430 240 Q474 202 502 230 Q470 270 430 240 Z" />
        </g>
      </g>
      <g fill="#d39a61" stroke="#a96f3f" strokeWidth="1.6">
        <rect x="248" y="26" width="16" height="510" />
        <rect x="48" y="208" width="446" height="14" />
        <rect x="48" y="374" width="446" height="14" />
      </g>
      <g opacity=".5" fill="#fff2cf">
        <rect x="256" y="26" width="4" height="510" /><rect x="48" y="210" width="446" height="3" />
      </g>
      <rect x="16" y="548" width="508" height="24" rx="6" fill="#d9a468" stroke="#a96f3f" strokeWidth="2" />
      <rect x="22" y="552" width="496" height="5" rx="2.5" fill="#f1c78e" opacity=".7" />

      {/* gauzy curtain at the right edge of the window */}
      <path d="M506 0 C552 90 542 200 558 320 C570 420 552 520 568 630 L646 630 C626 508 644 384 632 262 C622 148 640 58 628 0 Z" fill="url(#ws-curtain)" />
      <path d="M506 0 C552 90 542 200 558 320 C570 420 552 520 568 630" fill="none" stroke="#d9bd93" strokeWidth="4" opacity=".55" />
      <g fill="none" stroke="#e2c9a2" strokeWidth="4" opacity=".72">
        <path d="M536 0 C572 110 560 240 574 380 C584 480 570 560 582 630" />
        <path d="M574 0 C600 120 590 260 602 400 C610 500 598 570 608 630" />
      </g>
      <path d="M520 0 Q558 180 555 360 T572 630 L594 630 Q575 420 586 240 T553 0 Z" fill="#fffbee" opacity=".32" />

      {/* broad sunbeams falling across the room */}
      <path d="M120 120 L620 700 L840 700 L360 96 Z" fill="url(#ws-beam)" opacity=".62" />
      <path d="M310 96 L760 700 L930 700 L500 78 Z" fill="url(#ws-beam)" opacity=".42" />
      <path d="M480 110 L1040 700 L1120 700 L560 82 Z" fill="url(#ws-beam)" opacity=".22" />

      {/* warm wooden table */}
      <rect x="0" y="516" width="1400" height="284" fill="url(#ws-table)" />
      <rect x="0" y="512" width="1400" height="12" fill="#eebd82" />
      <rect x="0" y="524" width="1400" height="4" fill="#b9783f" opacity=".28" />
      <g stroke="#9c6132" strokeWidth="1.6" opacity=".2" fill="none">
        <path d="M0 566 C260 558 520 574 780 566 C1040 558 1240 574 1400 566" />
        <path d="M0 626 C300 618 560 634 820 626 C1080 618 1260 634 1400 626" />
        <path d="M0 700 C260 692 540 708 800 700 C1060 692 1260 708 1400 700" />
        <path d="M0 772 C280 764 560 780 820 772 C1080 764 1280 780 1400 772" />
      </g>
      <g stroke="#a86c38" strokeWidth="1.2" opacity=".16" fill="none">
        <path d="M40 590 Q220 584 400 592 T760 590 M820 604 Q1010 596 1200 606 T1400 600 M80 664 Q260 656 440 666 T800 662 M860 676 Q1050 668 1240 678 T1400 672" />
        <ellipse cx="1040" cy="596" rx="24" ry="5" /><ellipse cx="220" cy="708" rx="18" ry="4" />
        <ellipse cx="660" cy="740" rx="30" ry="5" /><ellipse cx="1220" cy="724" rx="20" ry="4" />
      </g>
      <path d="M0 540 L330 540 L740 800 L420 800 Z M520 536 L690 536 L1120 800 L960 800 Z M940 532 L1050 532 L1400 752 L1400 800 Z" fill="#fff2c8" opacity=".18" />
      <g stroke="#ffe9b3" strokeWidth="10" opacity=".14" strokeLinecap="round">
        <path d="M30 580 L300 800 M520 560 L900 800 M1050 580 L1290 760" />
      </g>
      <ellipse cx="690" cy="560" rx="540" ry="64" fill="#ffe9b8" opacity=".34" />
      <ellipse cx="450" cy="660" rx="360" ry="54" fill="#fff3cf" opacity=".24" />

      {/* contact shadows for the jar, penguin and books */}
      <ellipse cx="300" cy="614" rx="128" ry="17" fill="#6e452b" opacity=".16" />
      <ellipse cx="690" cy="606" rx="198" ry="20" fill="#6e452b" opacity=".15" />
      <ellipse cx="780" cy="620" rx="230" ry="18" fill="#5d3a22" opacity=".1" />
      <ellipse cx="1240" cy="590" rx="120" ry="12" fill="#6e452b" opacity=".12" />

      {/* hanging leaves, top-left */}
      <g>
        <path d="M-10 -10 C70 40 142 60 224 124" fill="none" stroke="#7d9c50" strokeWidth="4" />
        <path d="M62 22 C96 62 126 92 158 154" fill="none" stroke="#7d9c50" strokeWidth="3" />
        <g fill="#a8c47a" stroke="#719247" strokeWidth="1.6">
          <path d="M40 26 Q16 46 34 68 Q58 52 40 26 Z" />
          <path d="M94 48 Q74 74 96 96 Q118 76 94 48 Z" />
          <path d="M152 80 Q134 108 158 128 Q180 104 152 80 Z" />
          <path d="M198 114 Q186 144 212 160 Q230 134 198 114 Z" />
          <path d="M120 110 Q100 134 120 154 Q142 134 120 110 Z" />
          <path d="M72 70 Q58 92 74 108 Q90 88 72 70 Z" />
        </g>
        <g fill="#c3d996" stroke="#8ba763" strokeWidth="1.4">
          <path d="M70 40 Q90 18 112 34 Q98 58 70 40 Z" />
          <path d="M132 70 Q154 50 174 68 Q158 90 132 70 Z" />
          <path d="M142 132 Q164 116 182 134 Q164 154 142 132 Z" />
          <path d="M38 74 Q50 54 70 60 Q62 82 38 74 Z" />
        </g>
        <g fill="none" stroke="#5e7c43" strokeWidth="1" opacity=".42">
          <path d="M40 29 Q39 48 34 61 M94 51 Q96 72 96 90 M152 83 Q157 104 158 121 M70 40 Q89 37 105 35 M132 70 Q151 69 167 68" />
        </g>
      </g>
    </svg>
  );
}
