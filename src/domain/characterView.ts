import type { BehaviorDecision } from "./behavior";
import type { CharacterView, Snapshot } from "./types";

export function deriveCharacterView(snapshot: Snapshot, decision?: BehaviorDecision | null): CharacterView {
  if (decision) {
    return {
      expression: decision.expression,
      pose: decision.pose,
      animation: decision.animation,
      visibleLayerIds: ["body", "face"],
      effects: [],
      behaviorId: decision.behaviorId,
      category: decision.category,
      amplitude: decision.amplitude,
    };
  }
  void snapshot;
  return { expression: "neutral", pose: "stand", animation: "none", visibleLayerIds: ["body", "face"], effects: [] };
}