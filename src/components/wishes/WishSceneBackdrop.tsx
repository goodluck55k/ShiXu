/** Static storybook backdrop: sunny window, curtain and warm wooden table. Presentation only. */
export function WishSceneBackdrop() {
  return (
    <svg viewBox="0 0 1400 800" preserveAspectRatio="xMinYMax slice" aria-hidden="true" className="wish-backdrop">
      <defs>
        <linearGradient id="ws-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f8e0c0" />
          <stop offset="1" stopColor="#eec49a" />
        </linearGradient>
        <linearGradient id="ws-table" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e2ae70" />
          <stop offset=".5" stopColor="#d2955a" />
          <stop offset="1" stopColor="#c08048" />
        </linearGradient>
        <linearGradient id="ws-beam" x1="0" y1="0" x2=".6" y2="1">
          <stop offset="0" stopColor="#fff3cf" stopOpacity=".75" />
          <stop offset="1" stopColor="#fff3cf" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="ws-pane" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf8dd" />
          <stop offset="1" stopColor="#f4e9c0" />
        </linearGradient>
        <linearGradient id="ws-curtain" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fbeed6" />
          <stop offset=".5" stopColor="#f4e2c2" />
          <stop offset="1" stopColor="#fbeed6" />
        </linearGradient>
        <filter id="ws-bokeh" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="7" /></filter>
        <clipPath id="ws-window-clip"><rect x="86" y="60" width="540" height="470" rx="8" /></clipPath>
      </defs>

      <rect width="1400" height="800" fill="url(#ws-wall)" />
      <ellipse cx="420" cy="180" rx="620" ry="360" fill="#fff3d8" opacity=".35" />

      {/* window with sunlit foliage */}
      <rect x="66" y="40" width="580" height="512" rx="12" fill="#c98d5a" stroke="#a96f3f" strokeWidth="4" />
      <g clipPath="url(#ws-window-clip)">
        <rect x="86" y="60" width="540" height="470" fill="url(#ws-pane)" />
        <g filter="url(#ws-bokeh)">
          <circle cx="150" cy="120" r="60" fill="#b5cf8b" opacity=".8" />
          <circle cx="280" cy="80" r="46" fill="#cfe3a4" opacity=".8" />
          <circle cx="420" cy="140" r="70" fill="#9dbf72" opacity=".65" />
          <circle cx="560" cy="90" r="52" fill="#c3d996" opacity=".75" />
          <circle cx="200" cy="300" r="66" fill="#a8c47a" opacity=".55" />
          <circle cx="500" cy="330" r="80" fill="#b5cf8b" opacity=".5" />
          <circle cx="340" cy="430" r="60" fill="#9dbf72" opacity=".45" />
          <circle cx="120" cy="470" r="52" fill="#c3d996" opacity=".5" />
          <ellipse cx="360" cy="220" rx="180" ry="110" fill="#fffbe8" opacity=".6" />
        </g>
        <g opacity=".28" fill="#86a765" filter="url(#ws-bokeh)">
          <path d="M105 490 Q135 340 215 245 Q180 355 105 490 M135 387 Q95 355 94 310 Q150 326 135 387 M160 340 Q167 280 220 261 Q218 316 160 340" />
          <path d="M560 500 Q530 340 450 240 Q492 359 560 500 M531 385 Q574 350 579 305 Q522 328 531 385 M505 335 Q493 280 448 260 Q451 310 505 335" />
        </g>
        <g fill="#9cb97b" opacity=".22">
          <path d="M116 305 Q125 248 176 226 Q172 279 116 305 Z M513 235 Q544 180 596 188 Q570 238 513 235 Z M410 420 Q449 373 486 385 Q461 430 410 420 Z" />
        </g>
        <path d="M86 60 L300 60 L180 530 L86 530 Z" fill="#fffdf0" opacity=".35" />
      </g>
      <g fill="#c98d5a" stroke="#a96f3f" strokeWidth="2">
        <rect x="346" y="52" width="18" height="488" />
        <rect x="78" y="206" width="556" height="16" />
        <rect x="78" y="368" width="556" height="16" />
      </g>
      <rect x="52" y="540" width="610" height="24" rx="6" fill="#d9a468" stroke="#b0763f" strokeWidth="2" />

      {/* curtain */}
      <path d="M660 0 C700 90 690 200 706 320 C718 420 700 520 716 620 L790 620 C770 500 786 380 774 260 C764 150 780 60 768 0 Z" fill="url(#ws-curtain)" />
      <path d="M660 0 C700 90 690 200 706 320 C718 420 700 520 716 620" fill="none" stroke="#d9bd93" strokeWidth="4" opacity=".6" />
      <g fill="none" stroke="#dfc49c" strokeWidth="4" opacity=".8">
        <path d="M692 0 C724 110 712 240 726 380 C736 480 722 560 734 620" />
        <path d="M726 0 C752 120 742 260 754 400 C762 500 750 570 760 620" />
      </g>
      <path d="M675 0 Q714 180 711 360 T728 620 L750 620 Q731 420 742 240 T709 0 Z" fill="#fff9e9" opacity=".26" />
      <path d="M750 0 Q773 210 762 350 T775 620" fill="none" stroke="#ae875f" strokeWidth="12" opacity=".08" />

      {/* sunbeams across the room */}
      <path d="M250 90 L640 640 L880 640 L430 70 Z" fill="url(#ws-beam)" opacity=".5" />
      <path d="M420 80 L820 640 L960 640 L560 70 Z" fill="url(#ws-beam)" opacity=".35" />

      {/* wooden table */}
      <rect x="0" y="500" width="1400" height="300" fill="url(#ws-table)" />
      <rect x="0" y="498" width="1400" height="10" fill="#e8b87b" />
      <g stroke="#a96f3f" strokeWidth="2" opacity=".35">
        <path d="M0 560 H1400" /><path d="M0 636 H1400" /><path d="M0 716 H1400" />
      </g>
      <g stroke="#8f5c30" strokeWidth="1.4" opacity=".18" fill="none">
        <path d="M60 585 C300 578 560 592 820 584 C1080 577 1260 590 1400 583" />
        <path d="M0 668 C260 660 520 676 780 668 C1040 661 1240 674 1400 667" />
        <path d="M100 748 C360 740 620 756 880 748 C1120 741 1300 754 1400 748" />
        <ellipse cx="1050" cy="600" rx="26" ry="7" />
        <ellipse cx="240" cy="690" rx="20" ry="6" />
      </g>
      <ellipse cx="700" cy="560" rx="520" ry="70" fill="#ffe9b8" opacity=".38" />
      <ellipse cx="500" cy="640" rx="360" ry="56" fill="#fff3cf" opacity=".28" />
      <path d="M10 520 L340 520 L590 800 L380 800 Z M385 515 L500 515 L770 800 L690 800 Z" fill="#fff0cb" opacity=".12" />
      <g fill="none" stroke="#8e603b" opacity=".16" strokeLinecap="round">
        <path d="M10 540 Q180 529 340 541 T690 539 M720 548 Q930 535 1130 547 T1400 543 M40 608 Q240 596 420 608 T780 606 M850 617 Q1080 602 1390 614 M15 685 Q250 672 485 683 T900 683 M780 764 Q1050 750 1390 763" strokeWidth="2" />
        <path d="M80 550 Q190 545 290 551 M565 621 Q680 614 780 620 M1020 692 Q1180 684 1300 690 M260 760 Q400 753 540 759" />
      </g>
      <ellipse cx="300" cy="602" rx="125" ry="18" fill="#704a30" opacity=".14" />
      <ellipse cx="615" cy="612" rx="185" ry="20" fill="#704a30" opacity=".13" />

      {/* hanging leaves, top-left */}
      <g>
        <path d="M-10 -6 C60 40 130 60 210 120" fill="none" stroke="#7d9c50" strokeWidth="4" />
        <path d="M60 20 C90 60 120 90 150 150" fill="none" stroke="#7d9c50" strokeWidth="3" />
        <g fill="#a8c47a" stroke="#7d9c50" strokeWidth="1.6">
          <path d="M40 26 Q18 44 34 66 Q56 52 40 26 Z" />
          <path d="M92 48 Q74 72 94 92 Q114 74 92 48 Z" />
          <path d="M150 78 Q134 104 156 122 Q176 100 150 78 Z" />
          <path d="M196 112 Q184 140 208 154 Q224 130 196 112 Z" />
          <path d="M118 108 Q100 130 118 148 Q138 130 118 108 Z" />
        </g>
        <g fill="#c3d996" stroke="#8ba763" strokeWidth="1.4">
          <path d="M70 40 Q88 20 108 34 Q96 56 70 40 Z" />
          <path d="M130 70 Q150 52 168 68 Q154 88 130 70 Z" />
          <path d="M140 130 Q160 116 176 132 Q160 150 140 130 Z" />
        </g>
        <g fill="none" stroke="#617f45" strokeWidth="1" opacity=".45"><path d="M40 29 Q39 48 34 61 M92 51 Q94 70 94 88 M150 81 Q155 102 156 119 M70 40 Q89 37 104 35 M130 70 Q149 69 164 68" /></g>
      </g>
    </svg>
  );
}
