import { PERSONALITY_V2 } from "@/config/personality";
import type { Snapshot, SnapshotV2 } from "./types";

export function migrateSnapshotV2toV3(v2: SnapshotV2): Snapshot {
  const { totalXp, stage, ...character } = v2.character;
  const { companion, decorations, ...preserved } = v2;
  return { ...preserved, schemaVersion: 3, character,
    personality: { contributions: {}, dominantId: null, rulesVersion: PERSONALITY_V2.rulesVersion },
    offlineLife: { lastVisitAt: null, lastActiveAt: null, lastWindowStart: null, events: [] },
    reunion: { lastTriggeredWindowStart: null, lastTriggeredAt: null },
    legacy: { character: { totalXp, stage }, decorations, companion } };
}
