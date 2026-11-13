export const EMOTION_LABELS = [
  "joy",
  "calm",
  "sadness",
  "anxiety",
  "anger",
  "tired",
  "mixed",
  "neutral",
  "unknown",
] as const;

export type EmotionLabel = (typeof EMOTION_LABELS)[number];

export const EMOTION_NAMES: Record<EmotionLabel, string> = {
  joy: "开心",
  calm: "安心",
  sadness: "悲伤",
  anxiety: "焦虑",
  anger: "愤怒",
  tired: "疲惫",
  mixed: "复杂",
  neutral: "平常",
  unknown: "说不清",
};

export type EmotionSource = "ai" | "manual" | "corrected";

export interface EmotionDimensions {
  valence: number;
  arousal: number;
  dominance: number;
  intensity: number;
}

export interface EmotionReading extends EmotionDimensions {
  label: EmotionLabel;
  confidence: number | null;
  source: EmotionSource;
}

export interface Analysis extends EmotionDimensions {
  schemaVersion: 1;
  label: EmotionLabel;
  confidence: number;
}

export interface AnalysisMeta {
  provider: string;
  model: string;
  mappingVersion: string;
  dimensionSources: Record<string, string>;
}

export interface EmotionCorrection {
  fromRevision: number;
  toRevision: number;
  previousEmotion: EmotionReading;
  newEmotion: EmotionReading;
  correctedAt: number;
  analysis: Analysis | null;
  analysisMeta: AnalysisMeta | null;
}

export const MEMORY_EVENT_TYPES = [
  "ENTRY_SAVED",
  "ENTRY_TEXT_EDITED",
  "EMOTION_CORRECTED",
  "ITEM_UNLOCKED",
  "ITEM_HIDDEN",
  "ITEM_RESTORED",
  "ITEM_EQUIPPED",
  "ITEM_UNEQUIPPED",
  "STAGE_REACHED",
] as const;

export type MemoryEventType = (typeof MEMORY_EVENT_TYPES)[number];

export interface MemoryEvent {
  id: string;
  type: MemoryEventType;
  entryId: string | null;
  occurredAt: number;
  rulesVersion: string;
  payload: Record<string, string | number | boolean | null>;
}

export interface Entry {
  id: string;
  text: string;
  createdAt: number;
  updatedAt: number;
  dayKey: string;
  revision: number;
  originalAnalysis: Analysis | null;
  analysisMeta: AnalysisMeta | null;
  effectiveEmotion: EmotionReading;
  corrections: EmotionCorrection[];
  awardedXp: number;
  rulesVersion: string;
}

export interface CharacterState {
  totalXp: number;
  stage: number;
  latestEntryId: string | null;
  currentEmotion: EmotionReading | null;
}

export interface HiddenDecoration {
  hiddenEventId: string;
  sourceEntryId: string;
  slot: string;
  hiddenAt: number;
  reason: string;
}

export interface DecorationState {
  ownedIds: string[];
  equippedBySlot: Record<string, string>;
  hiddenById: Record<string, HiddenDecoration>;
}

export const PERSONALITY_DIMENSIONS = ["exploration", "serenity", "affinity"] as const;

export type PersonalityDimension = (typeof PERSONALITY_DIMENSIONS)[number];

export type PersonalityDeltas = Record<PersonalityDimension, number>;

export interface PersonalityContribution {
  dayKey: string;
  label: EmotionLabel;
  deltas: PersonalityDeltas;
  entryRevision: number;
}

export interface HabitProgress {
  countedDayKeys: string[];
  totalCount: number;
  formedAt: number | null;
}

// C4 候选结构，机制待确认，C1 只初始化为空列表
export interface WorldTrace {
  id: string;
  entryId: string | null;
  dayKey: string;
  kind: string;
  label: EmotionLabel;
  createdAt: number;
}

export interface CompanionState {
  contributions: Record<string, PersonalityContribution>;
  habits: Record<string, HabitProgress>;
  world: WorldTrace[];
  companionRulesVersion: string;
}

export const SNAPSHOT_SCHEMA_VERSION = 3;

export interface SnapshotV1 {
  schemaVersion: 1;
  revision: number;
  character: CharacterState;
  entries: Entry[];
  decorations: DecorationState;
  memories: MemoryEvent[];
  appliedEventIds: string[];
}

export interface SnapshotV2 {
  schemaVersion: 2;
  revision: number;
  character: CharacterState;
  entries: Entry[];
  decorations: DecorationState;
  memories: MemoryEvent[];
  appliedEventIds: string[];
  companion: CompanionState;
}


export interface Snapshot {
  schemaVersion: typeof SNAPSHOT_SCHEMA_VERSION;
  revision: number;
  character: Pick<CharacterState, "latestEntryId" | "currentEmotion">;
  entries: Entry[];
  memories: MemoryEvent[];
  appliedEventIds: string[];
  personality: import("./personality").PersonalityState;
  offlineLife: { lastVisitAt: number | null; lastActiveAt: number | null; lastWindowStart: number | null; events: unknown[] };
  reunion: { lastTriggeredWindowStart: number | null; lastTriggeredAt: number | null };
  legacy?: { character?: Pick<CharacterState, "totalXp" | "stage">; decorations?: unknown; companion?: unknown };
}

interface GameEventBase {
  eventId: string;
}

export interface ConfirmEntryEvent extends GameEventBase {
  type: "CONFIRM_ENTRY";
  entryId: string;
  text: string;
  emotion: EmotionReading;
  analysis: Analysis | null;
  analysisMeta: AnalysisMeta | null;
}

export interface EditEntryTextEvent extends GameEventBase {
  type: "EDIT_ENTRY_TEXT";
  entryId: string;
  expectedEntryRevision: number;
  text: string;
}

export interface CorrectEmotionEvent extends GameEventBase {
  type: "CORRECT_EMOTION";
  entryId: string;
  expectedEntryRevision: number;
  emotion: EmotionReading;
  analysis: Analysis | null;
  analysisMeta: AnalysisMeta | null;
}

export interface RestoreDecorationEvent extends GameEventBase {
  type: "RESTORE_DECORATION";
  itemId: string;
  expectedHiddenEventId: string;
}

export interface EquipDecorationEvent extends GameEventBase {
  type: "EQUIP_DECORATION";
  itemId: string;
}

export interface UnequipDecorationEvent extends GameEventBase {
  type: "UNEQUIP_DECORATION";
  itemId: string;
}

export type GameEvent =
  | ConfirmEntryEvent
  | EditEntryTextEvent
  | CorrectEmotionEvent
  | RestoreDecorationEvent
  | EquipDecorationEvent
  | UnequipDecorationEvent;

export interface GameContext {
  now: number;
  dayKey: string;
}

export interface RuleResult {
  snapshot: Snapshot;
  events: MemoryEvent[];
  changed: boolean;
}

export interface CharacterView {
  expression: string;
  pose: string;
  animation: string;
  visibleLayerIds: string[];
  effects: string[];
}