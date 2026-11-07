"use client";

import { useApp } from "@/application/AppProvider";

export function StorageRecoveryNotice() {
  const { state, exportRaw, resetStorage, enableTemporary, reload } = useApp();

  if (state.phase === "corrupt" || state.phase === "unsupported-version") {
    const title = state.phase === "corrupt" ? "本地存档已损坏" : "本地存档版本不支持";
    return (
      <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold text-amber-900">{title}</h2>
        <p className="mt-2 text-sm text-amber-800">
          为了保护你的记录，拾绪不会自动覆盖这份存档。可以先导出原始数据留底，再明确选择重置。
        </p>
        {state.problem && <p className="mt-1 text-xs text-amber-700">原因：{state.problem.reason}</p>}
        {state.saveError && (
          <p role="alert" className="mt-2 text-sm text-rose-700">
            {state.saveError}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={exportRaw}
            className="rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            导出原始数据
          </button>
          <button
            type="button"
            disabled={state.saving}
            onClick={() => {
              if (
                window.confirm(
                  "重置会清除这份无法读取的本地存档并从头开始。建议先导出原始数据。确定重置吗？",
                )
              ) {
                void resetStorage();
              }
            }}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
          >
            {state.saving ? "重置中…" : "确认重置存档"}
          </button>
        </div>
      </section>
    );
  }

  if (state.phase === "unavailable") {
    return (
      <section role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-5">
        <h2 className="text-lg font-semibold text-amber-900">浏览器本地存储不可用</h2>
        <p className="mt-2 text-sm text-amber-800">
          可能是浏览器禁止了站点数据或处于特殊隐私模式。你可以检查浏览器设置后重试，
          或选择临时体验——临时体验只保存在内存里，刷新后无法保留。
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void reload()}
            className="rounded-xl border border-amber-400 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            重新尝试读取
          </button>
          <button
            type="button"
            onClick={enableTemporary}
            className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            进入临时体验（刷新后不保留）
          </button>
        </div>
      </section>
    );
  }

  return null;
}