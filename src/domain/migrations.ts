import { PERSONALITY_V2 } from "@/config/personality";
import type { Snapshot, SnapshotV2, SnapshotV3 } from "./types";

export function migrateSnapshotV2toV3(v2: SnapshotV2): SnapshotV3 {
  const { totalXp, stage, ...character } = v2.character;
  const { companion, decorations, ...preserved } = v2;
  return { ...preserved, schemaVersion: 3, character,
    personality: { contributions: {}, dominantId: null, rulesVersion: PERSONALITY_V2.rulesVersion },
    offlineLife: { lastVisitAt: null, lastActiveAt: null, lastWindowStart: null, events: [] },
    reunion: { lastTriggeredWindowStart: null, lastTriggeredAt: null },
    legacy: { character: { totalXp, stage }, decorations, companion } };
}

// v3 只有“已触发”标记，无法反推用户是否看过问候；迁移不猜造待处理问候，避免擅自重播。
export function migrateSnapshotV3toV4(v3: SnapshotV3): Snapshot {
  return {
    ...v3,
    schemaVersion: 4,
    reunion: { ...v3.reunion, pending: null },
  };
}
