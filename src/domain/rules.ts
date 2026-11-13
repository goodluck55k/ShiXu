import { OFFLINE_LIFE_V1 } from "@/config/offlineLife";
import type { OfflineLifeEvent, OfflineLifeState } from "./offlineLife";
import { addContribution, createEmptyPersonality, reviseContribution } from "./personality";
import {
  SNAPSHOT_SCHEMA_VERSION,
  type ActivityCheckpointEvent,
  type ConfirmEntryEvent,
  type CorrectEmotionEvent,
  type EditEntryTextEvent,
  type EmotionCorrection,
  type Entry,
  type GameContext,
  type GameEvent,
  type MemoryEvent,
  type RuleResult,
  type SessionStartedEvent,
  type Snapshot,
} from "./types";

export const RULES_VERSION = "rules-v1";

export function createInitialSnapshot(): Snapshot {
  return {
    schemaVersion: SNAPSHOT_SCHEMA_VERSION,
    revision: 0,
    character: { latestEntryId: null, currentEmotion: null },
    entries: [],
    memories: [],
    appliedEventIds: [],
    personality: createEmptyPersonality(),
    offlineLife: { lastVisitAt: null, lastActiveAt: null, lastWindowStart: null, events: [] },
    reunion: { lastTriggeredWindowStart: null, lastTriggeredAt: null },
  };
}

function unchanged(snapshot: Snapshot): RuleResult {
  return { snapshot, events: [], changed: false };
}

// 单调推进 lastActiveAt：重复、乱序或重放都不会倒退；不写回忆、不改分数。
function advanceActivity(offlineLife: OfflineLifeState, at: number): OfflineLifeState {
  const lastActiveAt = Math.max(offlineLife.lastActiveAt ?? at, at);
  if (lastActiveAt === offlineLife.lastActiveAt) return offlineLife;
  return { ...offlineLife, lastActiveAt };
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
  const personality = addContribution(snapshot.personality, event.entryId, context.dayKey, event.emotion.label, event.emotion.intensity, entry.revision);
  if (!personality) return unchanged(snapshot);
  return {
    snapshot: {
      ...snapshot,
      character: { ...snapshot.character, latestEntryId: entry.id, currentEmotion: event.emotion },
      entries: [...snapshot.entries, entry],
      memories: [...snapshot.memories, memory],
      appliedEventIds: [...snapshot.appliedEventIds, event.eventId],
      personality,
      offlineLife: advanceActivity(snapshot.offlineLife, context.now),
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
  const personality = reviseContribution(snapshot.personality, event.entryId, event.emotion.label, event.emotion.intensity, nextRevision);
  if (!personality) return unchanged(snapshot);
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
      personality,
      offlineLife: advanceActivity(snapshot.offlineLife, context.now),
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
      offlineLife: advanceActivity(snapshot.offlineLife, context.now),
    },
    events: [memory],
    changed: true,
  };
}

function activityCheckpoint(
  snapshot: Snapshot,
  event: ActivityCheckpointEvent,
  context: GameContext,
): RuleResult {
  if (!Number.isFinite(event.at) || event.at < 0 || event.at > context.now) return unchanged(snapshot);
  const offlineLife = advanceActivity(snapshot.offlineLife, event.at);
  if (offlineLife === snapshot.offlineLife) return unchanged(snapshot);
  return { snapshot: { ...snapshot, offlineLife }, events: [], changed: true };
}

function sessionStarted(
  snapshot: Snapshot,
  event: SessionStartedEvent,
  context: GameContext,
): RuleResult {
  const baseline = snapshot.offlineLife.lastActiveAt ?? snapshot.offlineLife.lastVisitAt;
  // 窗口起点必须等于当前基准；保存成功后基准推进到 now，旧窗口无法再次提交。
  if (event.windowStart !== baseline) return unchanged(snapshot);

  const seenIds = new Set(snapshot.offlineLife.events.map((item) => item.id));
  const appended: OfflineLifeEvent[] = [];
  for (const item of event.offlineEvents) {
    if (seenIds.has(item.id)) continue;
    seenIds.add(item.id);
    appended.push(item);
  }
  const merged = [...snapshot.offlineLife.events, ...appended];
  const events = merged.length > OFFLINE_LIFE_V1.maxStoredEvents
    ? merged.slice(merged.length - OFFLINE_LIFE_V1.maxStoredEvents)
    : merged;

  const offlineLife: OfflineLifeState = {
    lastVisitAt: context.now,
    lastActiveAt: context.now,
    lastWindowStart: event.windowStart,
    events,
  };
  const reunion = event.reunionTriggered
    ? { lastTriggeredWindowStart: event.windowStart, lastTriggeredAt: context.now }
    : snapshot.reunion;
  return {
    snapshot: {
      ...snapshot,
      offlineLife,
      reunion,
      appliedEventIds: [...snapshot.appliedEventIds, event.eventId],
    },
    events: [],
    changed: true,
  };
}

export function applyGameEvent(
  snapshot: Snapshot,
  event: GameEvent,
  context: GameContext,
): RuleResult {
  // checkpoint 不进入 appliedEventIds，单调 max 保证重复/乱序/重放无副作用。
  if (event.type === "ACTIVITY_CHECKPOINT") return activityCheckpoint(snapshot, event, context);
  if (snapshot.appliedEventIds.includes(event.eventId)) return unchanged(snapshot);
  switch (event.type) {
    case "CONFIRM_ENTRY":
      return confirmEntry(snapshot, event, context);
    case "CORRECT_EMOTION":
      return correctEmotion(snapshot, event, context);
    case "EDIT_ENTRY_TEXT":
      return editEntryText(snapshot, event, context);
    case "SESSION_STARTED":
      return sessionStarted(snapshot, event, context);
    default:
      throw new Error(`事件 ${event.type} 在后续阶段实现`);
  }
}