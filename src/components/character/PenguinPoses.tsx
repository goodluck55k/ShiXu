import { PenguinFace } from "./PenguinFace";
import { PenguinFront } from "./PenguinFront";

const body = "#494139", ink = "#211a15", belly = "#fcf5eb", foot = "#ef9e21";
export type PenguinDirection = "front" | "left" | "right" | "back";

/** Original profiles derived from the proportions and palette of the front master. */
export function PenguinPose({ direction = "front", seated = false, rest, expression = "neutral", special }: { direction?: PenguinDirection; seated?: boolean; rest?: "kneel" | "curl"; expression?: string; special?: "smoke" | "drink" }) {
  if (direction === "front" && !seated) return <PenguinFront expression={expression} />;
  if (direction === "front") return <svg viewBox="0 0 195 201" width="195" height="201" aria-label="坐着的企鹅" role="img">
    {!rest && !special && <path d="M34 122 Q13 139 17 158 Q19 166 31 162 L52 143 M161 122 Q182 139 178 158 Q176 166 164 162 L143 143" fill={body} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />}
    {special && <path d="M34 122 Q13 139 17 158 Q19 166 31 162 L52 143" fill={body} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />}
    <g transform={rest === "curl" ? "translate(16 27) scale(.84 .85)" : rest === "kneel" ? "translate(0 10) scale(1 .94)" : undefined}>
    <path d="M97 28 C58 27 37 50 32 82 C28 104 19 133 24 153 C28 174 53 184 97 184 C141 184 167 174 171 153 C176 133 167 104 163 82 C158 50 137 27 97 28 Z" fill={body} stroke={ink} strokeWidth="3.5" />
    <path d="M96 66 C88 48 63 46 53 67 C48 78 47 92 39 111 C28 139 35 161 54 170 C76 180 120 180 141 170 C160 161 167 139 156 111 C148 92 147 78 142 67 C132 46 107 48 99 66 Z" fill={belly} stroke={ink} strokeWidth="2.4" />
    <g className={special ? "special-face" : undefined} transform={rest === "curl" ? "translate(0 29)" : rest === "kneel" ? "rotate(-8 97 75) translate(0 13)" : "translate(0 14)"}><PenguinFace expression={rest === "kneel" && expression === "neutral" ? "soft" : expression} /></g>
    {rest && <path d={rest === "kneel" ? "M34 119 Q21 141 29 157 Q34 165 44 160 Q49 155 44 143 L43 120 Z M161 119 Q174 141 166 157 Q161 165 151 160 Q146 155 151 143 L152 120 Z" : "M30 109 Q27 139 53 157 Q70 168 91 157 Q97 151 88 145 Q76 151 62 140 L45 112 Z M165 109 Q168 139 142 157 Q125 168 104 157 Q98 151 107 145 Q119 151 133 140 L150 112 Z"} fill={body} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />}
    </g>
    {special && <g className="special-wing" style={{ transformOrigin: "155px 122px" }}>
      <path d="M155 119 Q176 126 175 145 Q173 158 160 156 Q149 153 145 141 Z" fill={body} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
      {special === "smoke" ? <g className="special-prop"><path d="M169 146 L187 140" stroke="#fcf5eb" strokeWidth="4" strokeLinecap="round" /><path d="M184 141 L188 139" stroke="#ba7755" strokeWidth="3" /></g> : <g className="special-prop"><path d="M165 141 L181 141 L178 154 Q173 158 168 154 Z" fill="#e8d5bf" stroke={ink} strokeWidth="2" /><path d="M168 146 L179 146" stroke="#a67c5c" strokeWidth="2" /></g>}
    </g>}
    <path d="M42 166 Q23 167 25 177 Q27 185 51 185 Q70 185 75 178 Q74 171 60 169 Z M153 166 Q172 167 170 177 Q168 185 144 185 Q125 185 120 178 Q121 171 135 169 Z" fill={foot} stroke={ink} strokeWidth="3.5" />
  </svg>;
  if (direction === "back") return <svg viewBox="0 0 195 201" width="195" height="201" role="img" aria-label="企鹅背面">
    <path d="M37 76 C23 87 20 104 8 124 Q0 141 16 141 Q27 142 32 126 L48 92 M158 76 C172 87 175 104 187 124 Q195 141 179 141 Q168 142 163 126 L147 92" fill={body} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
    <path d="M97 12 C59 11 39 30 31 60 C28 73 27 82 24 92 C19 106 19 126 21 142 C23 164 34 177 53 182 C76 188 116 188 138 182 C157 177 170 164 173 143 C175 126 173 108 169 93 C166 82 166 71 164 59 C157 30 137 11 97 12 Z" fill={body} stroke={ink} strokeWidth="3.5" />
    <path d="M83 179 Q97 188 111 179 Q108 191 97 192 Q86 191 83 179 Z" fill={body} stroke={ink} strokeWidth="2" />
    <path d="M47 175 Q37 174 41 183 Q46 191 69 189 Q82 188 79 183 Q73 178 47 175 Z M148 175 Q158 174 154 183 Q149 191 126 189 Q113 188 116 183 Q122 178 148 175 Z" fill={foot} stroke={ink} strokeWidth="3.5" />
  </svg>;
  return <svg viewBox="0 0 195 201" width="195" height="201" role="img" aria-label={direction === "left" ? "企鹅左侧面" : "企鹅右侧面"}>
    <g transform={direction === "left" ? "translate(195 0) scale(-1 1)" : undefined}>
      <g data-part="side-back-foot" style={{ transformOrigin: "72px 178px" }}><path d="M69 174 Q51 173 48 181 Q49 188 73 189 Q86 189 91 184 Z" fill={foot} stroke={ink} strokeWidth="3.5" /></g>
      <path d="M95 12 C60 11 41 30 36 62 C34 79 28 100 30 130 C31 162 47 180 78 184 C103 188 132 183 143 167 C154 151 154 128 149 108 C145 90 144 72 139 55 C132 27 117 12 95 12 Z" fill={body} stroke={ink} strokeWidth="3.5" />
      <path d="M121 38 C136 39 142 53 142 68 C142 82 147 96 151 110 C156 132 151 158 137 169 C126 178 110 180 96 178 C113 168 118 151 119 131 C121 106 112 91 111 72 C110 55 111 43 121 38 Z" fill={belly} stroke={ink} strokeWidth="2.4" />
      <path d="M69 82 C55 91 50 109 48 130 Q47 146 57 148 Q69 148 76 133 L88 100 Z" fill={body} stroke={ink} strokeWidth="3.5" strokeLinejoin="round" />
      <circle cx="130" cy="55" r="6.3" fill="#100e0c" />
      <path d="M141 58 Q160 54 163 60 Q158 65 142 65 Z" fill="#ed9e25" stroke={ink} strokeWidth="1.5" />
      <g data-part="side-foot" style={{ transformOrigin: "112px 178px" }}><path d="M102 176 Q94 178 96 184 Q99 190 122 190 Q144 190 148 184 Q149 179 139 177 Z" fill={foot} stroke={ink} strokeWidth="3.5" /></g>
    </g>
  </svg>;
}
