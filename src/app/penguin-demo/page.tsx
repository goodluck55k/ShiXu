import type { Metadata } from "next";
import { PenguinDemo } from "./PenguinDemo";

export const metadata: Metadata = {
  title: "企鹅动作演示馆 · 拾绪 ShiXu",
  description: "直接播放拾绪企鹅已有的动作、表情与姿态，只做展示，不读写正式存档。",
};

export default function PenguinDemoPage() {
  return <PenguinDemo />;
}