"use client";

import { useApp } from "@/application/AppProvider";
import { deriveCharacterView } from "@/domain/characterView";
import { EMOTION_NAMES } from "@/domain/types";
import { CharacterRenderer } from "@/components/character/CharacterRenderer";
import { EmotionDraftForm } from "@/components/emotion/EmotionDraftForm";
import { DiaryHistory } from "@/components/memories/DiaryHistory";
import { StorageRecoveryNotice } from "@/components/StorageRecoveryNotice";

export function HomeScreen() {
  const { state, reload } = useApp();
  const { snapshot } = state;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-wide sm:text-3xl">拾绪 ShiXu</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-600">
          记录日常心情，陪伴一个全白小人成长。快乐化作成长的印记，悲伤被温柔收藏——
          让每一份情绪都有归处。
        </p>
      </header>

      {state.phase === "loading" && (
        <p role="status" className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-500">
          正在读取本地存档…
        </p>
      )}

      <StorageRecoveryNotice />

      {state.temporary && (
        <p role="alert" className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          临时体验模式：内容只保存在本页内存中，刷新或关闭页面后无法保留。
        </p>
      )}

      {state.tabConflict && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
          <p>检测到另一个标签页修改了存档，提交已暂停。请重新加载后继续。</p>
          <button
            type="button"
            onClick={() => void reload()}
            className="mt-2 rounded-lg border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
          >
            重新加载存档
          </button>
        </div>
      )}

      {state.phase === "ready" && snapshot && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className="space-y-6">
            <section
              aria-label="当前角色"
              className="rounded-2xl border border-stone-200 bg-white p-5 text-center shadow-sm"
            >
              <CharacterRenderer view={deriveCharacterView(snapshot)} />
              <p className="mt-2 text-sm text-stone-600">
                {snapshot.character.currentEmotion
                  ? `此刻的心情：${EMOTION_NAMES[snapshot.character.currentEmotion.label]}`
                  : "小人还是一张白纸，等待你的第一条日记。"}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                表情、装饰与成长视觉将在后续阶段点亮；当前为 P1 占位形象。
              </p>
              {state.savedTick > 0 && !state.saveError && (
                <p role="status" className="mt-2 text-xs font-medium text-teal-700">
                  {state.temporary ? "已记录（仅本次会话）" : "已保存到本地"}
                </p>
              )}
            </section>
            <DiaryHistory entries={snapshot.entries} />
          </div>
          <EmotionDraftForm />
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-stone-400">
        数据只保存在你的浏览器里 · 不会上传日记正文（当前版本无 AI 请求）
      </footer>
    </main>
  );
}