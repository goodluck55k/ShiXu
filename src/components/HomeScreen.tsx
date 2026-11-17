import { EmotionDraftForm } from "@/components/emotion/EmotionDraftForm";

/** 心情日记 /diary：手账纸页外观。装饰均为静态、aria-hidden，不参与交互。 */
export function HomeScreen() {
  return (
    <div className="page diary-page">
      <DiaryVine />
      <div className="diary-paper">
        <span className="diary-tape diary-tape-left" aria-hidden="true" />
        <span className="diary-bookmark" aria-hidden="true" />
        <header className="page-header diary-header">
          <PencilMark />
          <div className="diary-title">
            <p className="eyebrow">A LITTLE SPACE FOR YOU</p>
            <h1>写下今天<span className="title-dot">.</span></h1>
            <p>记录心情、想法和发生的事，不用修饰，原样保存就好。</p>
          </div>
          <DiaryShelf />
        </header>
        <EmotionDraftForm />
        <DiaryGrass />
      </div>
      <p className="page-footnote">✧ &nbsp; 只属于你的心情，安静地留在这里</p>
    </div>
  );
}

function PencilMark() {
  return (
    <svg className="diary-pencil" viewBox="0 0 64 64" aria-hidden="true">
      <ellipse cx="30" cy="56" rx="20" ry="3.2" fill="#e9d6bf" opacity=".7" />
      <g transform="rotate(42 32 32)">
        <rect x="24" y="4" width="16" height="40" rx="3" fill="#f2c46d" stroke="#8a5a2b" strokeWidth="2.4" />
        <rect x="24" y="4" width="16" height="8" rx="3" fill="#e9a3a0" stroke="#8a5a2b" strokeWidth="2.4" />
        <path d="M24 12h16" stroke="#8a5a2b" strokeWidth="2.4" />
        <path d="M24 44l8 14 8-14z" fill="#f8e2c2" stroke="#8a5a2b" strokeWidth="2.4" strokeLinejoin="round" />
        <path d="M29.6 53.8 32 58l2.4-4.2z" fill="#5a4030" />
        <path d="M32 14v28" stroke="#d9a24e" strokeWidth="2" />
      </g>
    </svg>
  );
}

function DiaryShelf() {
  return (
    <svg className="diary-shelf" viewBox="0 0 240 120" aria-hidden="true">
      <path d="M10 98h220" stroke="#c99a6b" strokeWidth="9" strokeLinecap="round" />
      <path d="M14 104h212" stroke="#e7c9a3" strokeWidth="3" strokeLinecap="round" opacity=".7" />
      <path d="M40 103v12M200 103v12" stroke="#c99a6b" strokeWidth="5" strokeLinecap="round" />
      {/* books */}
      <rect x="38" y="46" width="15" height="49" rx="2.5" fill="#efc77a" stroke="#9a7046" strokeWidth="2" transform="rotate(-10 45 95)" />
      <rect x="56" y="40" width="14" height="55" rx="2.5" fill="#a9bf8a" stroke="#6d7f4a" strokeWidth="2" />
      <rect x="72" y="47" width="12" height="48" rx="2.5" fill="#d9a7a0" stroke="#946158" strokeWidth="2" />
      <path d="M59 50h8M59 56h8M75 56h6" stroke="#fff6e8" strokeWidth="2" strokeLinecap="round" opacity=".8" />
      {/* small static penguin figurine */}
      <ellipse cx="128" cy="94" rx="22" ry="4" fill="#b88b5c" opacity=".35" />
      <ellipse cx="110" cy="74" rx="5" ry="11" transform="rotate(18 110 74)" fill="#3a3330" />
      <ellipse cx="146" cy="74" rx="5" ry="11" transform="rotate(-18 146 74)" fill="#3a3330" />
      <ellipse cx="128" cy="68" rx="19" ry="25" fill="#3a3330" />
      <ellipse cx="128" cy="76" rx="13" ry="16" fill="#fffaf1" />
      <path d="M128 50c-6-4-14-1-14 6 0 6 6 9 14 9s14-3 14-9c0-7-8-10-14-6z" fill="#fffaf1" />
      <circle cx="122.5" cy="56" r="2.2" fill="#2f2a28" /><circle cx="133.5" cy="56" r="2.2" fill="#2f2a28" />
      <path d="M125 60.5l3 3 3-3z" fill="#f2a641" />
      <circle cx="118.5" cy="61" r="2.4" fill="#f4b2a5" opacity=".75" /><circle cx="137.5" cy="61" r="2.4" fill="#f4b2a5" opacity=".75" />
      <path d="M119 91.5c-4 0-6 2-6 3.5h12c0-1.5-2-3.5-6-3.5zm18 0c-4 0-6 2-6 3.5h12c0-1.5-2-3.5-6-3.5z" fill="#f2a641" />
      {/* potted sprout */}
      <path d="M176 76h26l-4 19h-18z" fill="#dca57c" stroke="#9b6a46" strokeWidth="2" strokeLinejoin="round" />
      <path d="M189 76c0-12 0-18 0-24" stroke="#7f9a4c" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M189 60c-9-1-14-6-14-12 8 0 13 4 14 12zM189 56c8-1 12-6 13-11-8 0-12 4-13 11z" fill="#a9c27a" stroke="#7f9a4c" strokeWidth="1.6" />
    </svg>
  );
}

function DiaryVine() {
  return (
    <svg className="diary-vine" viewBox="0 0 220 200" aria-hidden="true">
      <path d="M220 6C170 10 150 40 128 70c-18 25-40 44-70 56M176 20c-6 22-2 44 12 62M140 58c-18-4-34 0-46 12" fill="none" stroke="#9cb36a" strokeWidth="2.4" strokeLinecap="round" />
      {[
        [196, 12, -20], [166, 30, 30], [150, 50, -40], [118, 84, 20], [92, 104, -30], [66, 122, 40], [182, 52, 60], [190, 76, 10], [112, 64, -70],
      ].map(([x, y, r], index) => (
        <path key={index} d="M0 0c-9-3-14-10-13-18 9 1 15 8 13 18z" transform={`translate(${x} ${y}) rotate(${r})`} fill={index % 3 === 0 ? "#b7cc84" : "#a3bd70"} stroke="#7f9a4c" strokeWidth="1.2" opacity=".92" />
      ))}
    </svg>
  );
}

function DiaryGrass() {
  return (
    <svg className="diary-grass" viewBox="0 0 900 40" aria-hidden="true">
      <g fill="none" stroke="#a9bf7c" strokeWidth="2.2" strokeLinecap="round">
        <path d="M30 38c-2-10 0-18 6-24M38 38c2-8 6-13 12-16M24 38c-4-6-9-9-14-10" />
        <path d="M860 38c2-10 0-18-6-24M852 38c-2-8-6-13-12-16M866 38c4-6 9-9 14-10" />
      </g>
    </svg>
  );
}
