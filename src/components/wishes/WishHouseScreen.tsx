"use client";

import { useSearchParams } from "next/navigation";
import { PenguinPose } from "@/components/character/PenguinPoses";
import { useWishHouse } from "@/application/useWishHouse";
import { DEV_SAMPLE_WISH_MODELS, toWishView } from "./wishView";
import { WishJar } from "./WishJar";
import { WishBoard } from "./WishBoard";
import { WishComposer } from "./WishComposer";
import { WishSceneBackdrop } from "./WishSceneBackdrop";
import { WishStorageNotice } from "./WishStorageNotice";
import { CornerLeaves, Daisies, LyingBooks, NoteCard, StandingBooks, TeaCup } from "./WishDecor";

export function WishHouseScreen() {
  const params = useSearchParams();
  // Sample wishes exist only in development; production ignores ?preview=sample.
  const preview = process.env.NODE_ENV === "development" && params.get("preview") === "sample";
  // Remount when the mode changes so the hook never carries a preview session into real storage.
  return <WishHouseScreenContent key={preview ? "preview" : "real"} preview={preview} />;
}

function WishHouseScreenContent({ preview }: { preview: boolean }) {
  const wishHouse = useWishHouse(preview ? DEV_SAMPLE_WISH_MODELS : null);
  const wishes = wishHouse.wishes.map(toWishView);
  const pending = wishes.filter((wish) => wish.status === "pending");
  const completed = wishes.filter((wish) => wish.status === "completed");
  const loading = wishHouse.phase === "loading";
  const readable = wishHouse.phase === "ready";

  function handleReset() {
    if (!window.confirm("这会覆盖当前无法读取的愿望原始数据。请确认已经导出备份。确定重置愿望存储吗？")) return;
    void wishHouse.resetWishes();
  }

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
      <WishStorageNotice
        phase={wishHouse.phase}
        problem={wishHouse.problem}
        tabConflict={wishHouse.tabConflict}
        saving={wishHouse.saving}
        recoveryError={wishHouse.recoveryError}
        onReload={wishHouse.reloadWishes}
        onExport={wishHouse.exportRaw}
        onReset={handleReset}
      />
      <div className="wish-stage">
        <div className="wish-scene">
          <WishSceneBackdrop />
          <span className="wish-decor note"><NoteCard /></span>
          <span className="wish-decor books-left"><StandingBooks /></span>
          <span className="wish-decor daisies"><Daisies /></span>
          <span className="wish-decor cup"><TeaCup /></span>
          <span className="wish-decor books-right"><LyingBooks /></span>
          <div className="wish-penguin"><PenguinPose direction="front" seated expression="happy" /></div>
          <div className="wish-jar"><WishJar pending={pending} completed={completed} celebration={wishHouse.celebration} /></div>
        </div>
        <WishBoard
          key={`wish-board-${wishHouse.loadId}`}
          wishes={wishes}
          loading={loading}
          readable={readable}
          canWrite={wishHouse.canWrite}
          saving={wishHouse.saving}
          busyWishId={wishHouse.busyWishId}
          completionNotice={wishHouse.completionNotice}
          onComplete={wishHouse.completeWish}
        />
        <WishComposer
          preview={preview}
          saving={wishHouse.saving}
          canWrite={wishHouse.canWrite}
          blockedReason={wishHouse.blockedReason}
          onCreate={wishHouse.createWish}
        />
      </div>
      <p className="page-footnote">✧ &nbsp; 每一个小愿望，都会被温柔地收好</p>
    </div>
  );
}