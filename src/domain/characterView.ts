import type { CharacterView, Snapshot } from "./types";

export function deriveCharacterView(snapshot: Snapshot): CharacterView {
  void snapshot;
  return { expression: "none", pose: "idle", animation: "none", visibleLayerIds: [], effects: [] };
}