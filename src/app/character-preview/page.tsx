import { readFileSync } from "node:fs";
import path from "node:path";
import { notFound } from "next/navigation";
import { PenguinFront } from "@/components/character/PenguinFront";

export const dynamic = "force-dynamic";

export default function CharacterPreview() {
  if (process.env.NODE_ENV !== "development") notFound();
  const reference = readFileSync(path.join(process.cwd(), "docs/assets/character/references/01_penguin_front_master_reference.png")).toString("base64");
  return (
    <main style={{ fontFamily: "sans-serif", background: "#f7f1e8", color: "#30271f", padding: 32, minHeight: "100vh" }}>
      <h1>企鹅正面母版 · 视觉待验收</h1>
      <p>参考图的背景与地面阴影不是角色的一部分。两图按同一裁图坐标尺寸显示。</p>
      <section style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "start" }}>
        <div><h2>原始正面参考</h2>{/* Local user-supplied reference, deliberately unoptimized for comparison. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`data:image/png;base64,${reference}`} width={320} height={330} alt="用户确认的企鹅正面参考图" /></div>
        <div><h2>SVG 母版</h2><div style={{ background: "#fcf6ed" }}><PenguinFront size={320} /></div></div>
      </section>
      <h2>尺寸与背景</h2>
      <section style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "end" }}>
        <div style={{ background: "white", padding: 16 }}><PenguinFront size={240} /><p>大 · 纯白</p></div>
        <div style={{ background: "#eddfc9", padding: 16 }}><PenguinFront size={120} /><p>中 · 绘本色调</p></div>
        <div style={{ background: "white", padding: 16 }}><PenguinFront size={48} /><p>小</p></div>
      </section>
      <h2>细节放大</h2><p>面部、身体轮廓、翅膀和双脚</p>
      <div style={{ background: "#fff", display: "inline-block" }}><PenguinFront size={585} /></div>
    </main>
  );
}
