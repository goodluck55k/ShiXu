import type { Snapshot } from "@/domain/types";

export type LoadResult =
  | { status: "missing" }
  | { status: "ready"; snapshot: Snapshot }
  | { status: "unsupported-version"; raw: string; reason: string }
  | { status: "corrupt"; raw: string; reason: string }
  | { status: "unavailable"; reason: string };

export type SaveResult =
  | { status: "saved"; snapshot: Snapshot }
  | { status: "conflict"; reason: string }
  // 保存前发现现有存档不可读：返回原始内容供导出，调用方进入恢复状态且不得覆盖。
  | { status: "corrupt"; raw: string; reason: string }
  | { status: "unsupported-version"; raw: string; reason: string }
  | { status: "unavailable"; reason: string }
  | { status: "quota-exceeded"; reason: string }
  | { status: "invalid"; reason: string };

export interface StoragePort {
  load(): Promise<LoadResult>;
  save(snapshot: Snapshot, expectedRevision: number): Promise<SaveResult>;
  readRaw(): string | null;
  reset(): Promise<SaveResult>;
}