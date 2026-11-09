import {
  buildContribution,
  createEmptyCompanion,
  reviseContribution,
} from "./companion";
import {
  SNAPSHOT_SCHEMA_VERSION,
  type ConfirmEntryEvent,
  type CorrectEmotionEvent,
  type EditEntryTextEvent,
  type EmotionCorrection,
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
    companion: createEmptyCompanion(),
  };
}

function unchanged(snapshot: Snapshot): RuleResult {
  return { snapshot, events: [], changed: false };
}

function findEntry(snapshot: Snapshot, entryId: string): Entry | undefined {
  return snapshot.entries.find((entry) => entry.id === entryId);
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
  const contribution = buildContribution(
    context.dayKey,
    event.emotion.label,
    entry.revision,
    snapshot.companion.contributions,
  );
  return {
    snapshot: {
      ...snapshot,
      character: { ...snapshot.character, latestEntryId: entry.id, currentEmotion: event.emotion },
      entries: [...snapshot.entries, entry],
      memories: [...snapshot.memories, memory],
      appliedEventIds: [...snapshot.appliedEventIds, event.eventId],
      companion: {
        ...snapshot.companion,
        contributions: {
          ...snapshot.companion.contributions,
          [event.entryId]: contribution,
        },
      },
    },
    events: [memory],
    changed: true,
  };
}

function correctEmotion(
  snapshot: Snapshot,
  event: CorrectEmotionEvent,
  context: GameContext,
): RuleResult {
  const entry = findEntry(snapshot, event.entryId);
  if (!entry || entry.revision !== event.expectedEntryRevision) return unchanged(snapshot);

  const nextRevision = entry.revision + 1;
  const correction: EmotionCorrection = {
    fromRevision: entry.revision,
    toRevision: nextRevision,
    previousEmotion: entry.effectiveEmotion,
    newEmotion: event.emotion,
    correctedAt: context.now,
    analysis: event.analysis,
    analysisMeta: event.analysisMeta,
  };
  const nextEntry: Entry = {
    ...entry,
    updatedAt: context.now,
    revision: nextRevision,
    effectiveEmotion: event.emotion,
    corrections: [...entry.corrections, correction],
  };
  const memory: MemoryEvent = {
    id: `${event.eventId}:EMOTION_CORRECTED:${event.entryId}`,
    type: "EMOTION_CORRECTED",
    entryId: event.entryId,
    occurredAt: context.now,
    rulesVersion: RULES_VERSION,
    payload: {
      previousLabel: entry.effectiveEmotion.label,
      newLabel: event.emotion.label,
      toRevision: nextRevision,
    },
  };
  // 替换修订沿用该日记冻结的 dayKey；v1 旧日记无台账贡献时不补算
  const contributions = reviseContribution(
    snapshot.companion.contributions,
    event.entryId,
    event.emotion.label,
    nextRevision,
  );
  const isLatest = snapshot.character.latestEntryId === event.entryId;
  return {
    snapshot: {
      ...snapshot,
      character: isLatest
        ? { ...snapshot.character, currentEmotion: event.emotion }
        : snapshot.character,
      entries: snapshot.entries.map((item) => (item.id === event.entryId ? nextEntry : item)),
      memories: [...snapshot.memories, memory],
      appliedEventIds: [...snapshot.appliedEventIds, event.eventId],
      companion: { ...snapshot.companion, contributions },
    },
    events: [memory],
    changed: true,
  };
}

function editEntryText(
  snapshot: Snapshot,
  event: EditEntryTextEvent,
  context: GameContext,
): RuleResult {
  const entry = findEntry(snapshot, event.entryId);
  if (!entry || entry.revision !== event.expectedEntryRevision) return unchanged(snapshot);
  if (event.text.trim().length === 0) return unchanged(snapshot);

  const nextRevision = entry.revision + 1;
  const nextEntry: Entry = {
    ...entry,
    text: event.text,
    updatedAt: context.now,
    revision: nextRevision,
  };
  const memory: MemoryEvent = {
    id: `${event.eventId}:ENTRY_TEXT_EDITED:${event.entryId}`,
    type: "ENTRY_TEXT_EDITED",
    entryId: event.entryId,
    occurredAt: context.now,
    rulesVersion: RULES_VERSION,
    payload: { toRevision: nextRevision },
  };
  return {
    snapshot: {
      ...snapshot,
      entries: snapshot.entries.map((item) => (item.id === event.entryId ? nextEntry : item)),
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
    case "CORRECT_EMOTION":
      return correctEmotion(snapshot, event, context);
    case "EDIT_ENTRY_TEXT":
      return editEntryText(snapshot, event, context);
    default:
      throw new Error(`事件 ${event.type} 在后续阶段实现`);
  }
}