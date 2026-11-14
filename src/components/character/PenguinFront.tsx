import type { CSSProperties } from "react";

// Sampled from the supplied concept; kept together for visual iteration.
const COLORS = {
  body: "#494139",
  outline: "#211a15",
  belly: "#fcf5eb",
  eye: "#100e0c",
  beak: "#ed9e25",
  foot: "#ef9e21",
};

type PenguinFrontProps = { size?: number; style?: CSSProperties };

/** Static, presentation-only front master. Coordinates follow the reference crop. */
export function PenguinFront({ size = 195, style }: PenguinFrontProps) {
  return (
    <svg viewBox="0 0 195 201" width={size} height={size * 201 / 195} style={style} role="img" aria-label="正面的黑白企鹅">
      {/* The wing groups sit behind the continuous head/body silhouette. */}
      <g data-part="left-wing" style={{ transformOrigin: "39px 91px" }}>
        <path d="M37 76 C29 84 25 94 18 104 C11 114 5 124 5 132 C5 138 9 141 15 141 C21 142 25 139 27 134 C30 123 37 103 48 92 Z" fill={COLORS.body} stroke={COLORS.outline} strokeWidth="3.5" strokeLinejoin="round" />
      </g>
      <g data-part="right-wing" style={{ transformOrigin: "156px 91px" }}>
        <path d="M158 76 C166 84 170 94 177 104 C184 115 190 125 190 133 C190 139 186 142 180 141 C174 142 170 139 168 134 C164 122 158 103 147 92 Z" fill={COLORS.body} stroke={COLORS.outline} strokeWidth="3.5" strokeLinejoin="round" />
      </g>
      <path data-part="body" d="M97 12 C59 11 39 30 31 60 C28 73 27 82 24 92 C19 106 19 126 21 142 C23 164 34 177 53 182 C76 188 116 188 138 182 C157 177 170 164 173 143 C175 126 173 108 169 93 C166 82 166 71 164 59 C157 30 137 11 97 12 Z" fill={COLORS.body} stroke={COLORS.outline} strokeWidth="3.5" strokeLinejoin="round" />
      <path data-part="face-belly" d="M95 53 C92 39 82 33 71 35 C57 37 48 47 46 62 C44 77 40 88 34 101 C28 115 27 132 30 145 C33 165 46 175 64 179 C83 183 109 183 128 179 C147 175 159 165 163 145 C166 130 166 115 160 100 C154 87 151 75 149 61 C147 46 138 37 125 35 C112 33 101 39 99 53 Z" fill={COLORS.belly} stroke={COLORS.outline} strokeWidth="2.4" strokeLinejoin="round" />
      {/* Feet pivot near their attachment to the body. */}
      <g data-part="left-foot" style={{ transformOrigin: "61px 177px" }}>
        <path d="M47 175 C42 174 40 178 41 182 C42 187 50 189 59 189 C68 190 76 188 79 185 C81 182 77 180 72 179 C63 177 54 175 47 175 Z" fill={COLORS.foot} stroke={COLORS.outline} strokeWidth="3.5" />
      </g>
      <g data-part="right-foot" style={{ transformOrigin: "130px 177px" }}>
        <path d="M117 179 C112 180 109 182 111 185 C114 188 122 190 131 189 C140 189 147 186 148 182 C149 178 146 174 142 175 C134 175 125 177 117 179 Z" fill={COLORS.foot} stroke={COLORS.outline} strokeWidth="3.5" />
      </g>
      <circle data-part="left-eye" cx="68" cy="52" r="6.8" fill={COLORS.eye} />
      <circle data-part="right-eye" cx="121" cy="52" r="6.8" fill={COLORS.eye} />
      <ellipse data-part="beak" cx="94.5" cy="57" rx="9.6" ry="5.4" fill={COLORS.beak} stroke={COLORS.outline} strokeWidth="1.5" />
    </svg>
  );
}
