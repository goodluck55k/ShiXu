"use client";

import { useSearchParams } from "next/navigation";
import { PenguinPose } from "@/components/character/PenguinPoses";
import { DEV_SAMPLE_WISHES, type WishView } from "./wishView";
import { WishJar } from "./WishJar";
import { WishBoard } from "./WishBoard";
import { WishComposer } from "./WishComposer";
import { WishSceneBackdrop } from "./WishSceneBackdrop";
import { CornerLeaves, Daisies, LyingBooks, NoteCard, StandingBooks, TeaCup } from "./WishDecor";

export function WishHouseScreen() {
  const params = useSearchParams();
  // Sample wishes exist only in development and are always labelled on screen.
  const preview = process.env.NODE_ENV === "development" && params.get("preview") === "sample";
  const wishes: WishView[] = preview ? DEV_SAMPLE_WISHES : [];
  const pending = wishes.filter((w) => w.status === "pending").length;
  const completed = wishes.filter((w) => w.status === "completed").length;

  return (
    <div className="page wishes-page">
      <div className="mobile-wish-brand" aria-hidden="true">♧ <b>拾绪 <small>ShiXu</small></b></div>
      <header className="page-header wish-header">
        <div>
          <p className="eyebrow">A LITTLE WISH FOR TOMORROW</p>
          <h1>许愿屋<span className="title-dot">.</span></h1>
          <p>把心里的小愿望写下来，放进许愿杯里，慢慢去实现吧。♡</p>
        </div>
        <CornerLeaves />
      </header>
      {preview && <p className="wish-preview-badge" role="note">开发预览示例 · 非真实愿望数据，不会写入存档</p>}
      <div className="wish-stage">
        <div className="wish-scene">
          <WishSceneBackdrop />
          <span className="wish-decor note"><NoteCard /></span>
          <span className="wish-decor books-left"><StandingBooks /></span>
          <span className="wish-decor daisies"><Daisies /></span>
          <span className="wish-decor cup"><TeaCup /></span>
          <span className="wish-decor books-right"><LyingBooks /></span>
          <div className="wish-penguin"><PenguinPose direction="front" seated expression="happy" /></div>
          <div className="wish-jar"><WishJar pending={pending} completed={completed} /></div>
        </div>
        <WishBoard wishes={wishes} />
        <WishComposer />
      </div>
      <p className="page-footnote">✧ &nbsp; 每一个小愿望，都会被温柔地收好</p>
    </div>
  );
}