import {
  SNAPSHOT_SCHEMA_VERSION,
  type ConfirmEntryEvent,
  type Entry,
  type GameContext,
  type GameEvent,
  type MemoryEvent,
  type RuleResult,
  type Snapshot,
} from "./types";

export const RULES_VERSION = "rules-v1";

export function createInitialSnapshot(): Snapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    revision: 0,
    character: { totalXp: 0, stage: 0, latestEntryId: null, currentEmotion: null },
    entries: [],
    decorations: { ownedIds: [], equippedBySlot: {}, hiddenById: {} },
    memories: [],
    appliedEventIds: [],
  };
}

function unchanged(snapshot: Snapshot): RuleResult {
  return { snapshot, events: [], changed: false };
}

function confirmEntry(
  snapshot: Snapshot,
  event: ConfirmEntryEvent,
  context: GameContext,
): RuleResult {
  if (event.text.trim().length === 0) return unchanged(snapshot);
  if (snapshot.entries.some((entry) => entry.id === event.entryId)) return unchanged(snapshot);

  const entry: Entry = {
    id: event.entryId,
    text: event.text,
    createdAt: context.now,
    updatedAt: context.now,
    dayKey: context.dayKey,
    revision: 0,
    originalAnalysis: event.analysis,
    analysisMeta: event.analysisMeta,
    effectiveEmotion: event.emotion,
    corrections: [],
    awardedXp: 0,
    rulesVersion: RULES_VERSION,
  };
  const memory: MemoryEvent = {
    id: `${event.eventId}:ENTRY_SAVED:${event.entryId}`,
    type: "ENTRY_SAVED",
    entryId: event.entryId,
    occurredAt: context.now,
    rulesVersion: RULES_VERSION,
    payload: { emotionLabel: event.emotion.label, source: event.emotion.source },
  };
  return {
    snapshot: {
      ...snapshot,
      character: { ...snapshot.character, latestEntryId: entry.id, currentEmotion: event.emotion },
      entries: [...snapshot.entries, entry],
      memories: [...snapshot.memories, memory],
      appliedEventIds: [...snapshot.appliedEventIds, event.eventId],
    },
    events: [memory],
    changed: true,
  };
}

export function applyGameEvent(
  snapshot: Snapshot,
  event: GameEvent,
  context: GameContext,
): RuleResult {
  if (snapshot.appliedEventIds.includes(event.eventId)) return unchanged(snapshot);
  switch (event.type) {
    case "CONFIRM_ENTRY":
      return confirmEntry(snapshot, event, context);
    default:
      throw new Error(`事件 ${event.type} 在后续阶段实现`);
  }
}