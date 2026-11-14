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
        <path d="M36 84 C27 92 21 104 13 116 C5 128 1 144 5 154 C7 161 13 166 22 166 C27 166 30 162 32 155 L48 103 Z" fill={COLORS.body} stroke={COLORS.outline} strokeWidth="3.5" strokeLinejoin="round" />
      </g>
      <g data-part="right-wing" style={{ transformOrigin: "156px 91px" }}>
        <path d="M159 84 C168 93 174 105 181 117 C189 130 193 145 189 155 C187 162 181 166 173 166 C167 166 164 161 162 154 L147 103 Z" fill={COLORS.body} stroke={COLORS.outline} strokeWidth="3.5" strokeLinejoin="round" />
      </g>
      <path data-part="body" d="M97 12 C59 11 39 30 31 60 C28 73 29 81 30 92 C26 108 21 127 20 143 C22 167 35 180 54 184 C76 189 117 189 140 184 C160 180 173 166 175 143 C174 126 169 108 165 92 C166 80 167 71 164 59 C157 30 137 11 97 12 Z" fill={COLORS.body} stroke={COLORS.outline} strokeWidth="3.5" strokeLinejoin="round" />
      <path data-part="face-belly" d="M95 53 C92 39 82 33 71 35 C57 37 48 47 46 62 C44 77 40 88 34 101 C27 116 27 132 30 146 C34 168 48 177 65 180 C84 184 111 184 130 180 C149 177 162 167 165 146 C168 131 167 115 160 100 C154 87 151 75 149 61 C147 46 138 37 125 35 C112 33 101 39 99 53 Z" fill={COLORS.belly} stroke={COLORS.outline} strokeWidth="2.4" strokeLinejoin="round" />
      {/* Feet pivot near their attachment to the body. */}
      <g data-part="left-foot" style={{ transformOrigin: "61px 177px" }}>
        <path d="M46 176 C40 177 39 183 45 186 C52 190 68 190 78 186 C81 185 81 182 77 180 Z" fill={COLORS.foot} stroke={COLORS.outline} strokeWidth="3.5" />
      </g>
      <g data-part="right-foot" style={{ transformOrigin: "130px 177px" }}>
        <path d="M112 180 C108 182 108 185 112 186 C122 190 137 190 144 186 C150 183 149 177 143 176 Z" fill={COLORS.foot} stroke={COLORS.outline} strokeWidth="3.5" />
      </g>
      <circle data-part="left-eye" cx="68" cy="52" r="6.8" fill={COLORS.eye} />
      <circle data-part="right-eye" cx="121" cy="52" r="6.8" fill={COLORS.eye} />
      <ellipse data-part="beak" cx="94.5" cy="57" rx="9.6" ry="5.4" fill={COLORS.beak} stroke={COLORS.outline} strokeWidth="1.5" />
    </svg>
  );
}
