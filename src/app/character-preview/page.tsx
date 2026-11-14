import { readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { ActionPreview, SpecialPreview } from "./ActionPreview";
import { PenguinFront } from "@/components/character/PenguinFront";

export const dynamic = "force-dynamic";

const expressions = [
  ["neutral", "自然"], ["happy", "开心"], ["soft", "温柔"],
  ["sad", "失落"], ["wary", "担心"], ["angry", "不满"],
  ["tired", "困倦"], ["mixed", "纠结"], ["blank", "放空"],
] as const;

export default function CharacterPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const board = readFileSync(path.join(process.cwd(), "docs/assets/character/references/00_original_design_board.png")).toString("base64");
  return (
    <main style={{ fontFamily: "sans-serif", background: "#f7f1e8", color: "#30271f", padding: 32, minHeight: "100vh" }}>
      <SpecialPreview />
      <ActionPreview />
      <h1>企鹅九种表情 · 视觉待用户验收</h1>
      <p>同一已验收正面母版，仅切换五官；表情 ID 不与日记情绪一一对应。</p>
      <h2>完整企鹅对照</h2>
      <section style={{ display: "grid", gridTemplateColumns: "repeat(9, minmax(100px, 1fr))", gap: 8, overflowX: "auto" }}>
        {expressions.map(([id, name]) => <div key={id} style={{ textAlign: "center", background: "#fffaf3", padding: 12 }}><PenguinFront size={140} expression={id} style={{ width: "100%", height: "auto" }} /><p>{name} · {id}</p></div>)}
      </section>
      <h2>小尺寸对照</h2>
      <section style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
        {expressions.map(([id, name]) => <div key={id} style={{ textAlign: "center" }}><PenguinFront size={48} expression={id} /><p>{name}<br />{id}</p></div>)}
      </section>
      <h2>未知表情回退</h2>
      <section style={{ display: "flex", gap: 24, textAlign: "center" }}><div><PenguinFront size={120} expression="neutral" /><p>neutral</p></div><div><PenguinFront size={120} expression="unrecognized-expression" /><p>未知 → neutral</p></div></section>
      <h2>原始设计板对照</h2>
      <p>设计板仅供参考；实际 SVG 使用上方同一企鹅母版。</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={`data:image/png;base64,${board}`} alt="用户提供的原始企鹅角色与表情设计板" style={{ width: "100%", maxWidth: 1200, height: "auto" }} />
    </main>
  );
}
