"use client";

import type { WishPhase } from "@/application/useWishHouse";

export function WishStorageNotice({
  phase,
  problem,
  tabConflict,
  saving,
  recoveryError,
  onReload,
  onExport,
  onReset,
}: {
  phase: WishPhase;
  problem: { raw: string; reason: string } | null;
  tabConflict: boolean;
  saving: boolean;
  recoveryError: string | null;
  onReload: () => void;
  onExport: () => void;
  onReset: () => void;
}) {
  const problemPhase = phase === "corrupt" || phase === "unsupported-version";
  const unavailable = phase === "unavailable";
  if (!problemPhase && !unavailable && !tabConflict) return null;

  return (
    <div className="wish-storage-notices">
      {problemPhase && (
        <section className="wish-storage-notice" role="alert">
          <strong>{phase === "corrupt" ? "愿望数据暂时无法读取。" : "愿望数据来自更新的版本。"}</strong>
          <p>{problem?.reason ?? "当前页面无法解析这份愿望数据。"}</p>
          <p>原始内容已保留，不会被自动覆盖。请先导出备份，确认后再重置愿望存储。</p>
          <div className="wish-storage-actions">
            <button type="button" onClick={onExport} disabled={!problem?.raw}>导出原始愿望数据</button>
            <button type="button" className="danger" onClick={onReset} disabled={saving}>重置愿望存储</button>
            <button type="button" onClick={onReload} disabled={saving}>重新加载愿望</button>
          </div>
          {recoveryError && <p className="wish-storage-error" role="alert">{recoveryError}</p>}
        </section>
      )}
      {unavailable && (
        <section className="wish-storage-notice" role="alert">
          <strong>浏览器存储不可用。</strong>
          <p>暂时无法读取或保存愿望；你输入的文字不会被上传。请检查浏览器隐私设置后重试。</p>
          <div className="wish-storage-actions">
            <button type="button" onClick={onReload}>重试</button>
          </div>
        </section>
      )}
      {tabConflict && (
        <section className="wish-storage-notice conflict" role="alert">
          <strong>愿望已在其他标签页更新。</strong>
          <p>为避免覆盖较新的愿望，本页已暂停保存。你当前的输入仍保留在下方。</p>
          <div className="wish-storage-actions">
            <button type="button" onClick={onReload}>重新加载愿望</button>
          </div>
        </section>
      )}
    </div>
  );
}