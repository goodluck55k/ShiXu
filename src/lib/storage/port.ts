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
  | { status: "unavailable"; reason: string }
  | { status: "quota-exceeded"; reason: string }
  | { status: "invalid"; reason: string };

export interface StoragePort {
  load(): Promise<LoadResult>;
  save(snapshot: Snapshot, expectedRevision: number): Promise<SaveResult>;
  readRaw(): string | null;
  reset(): Promise<SaveResult>;
}