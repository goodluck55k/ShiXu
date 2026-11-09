import { PERSONALITY_PARAMS } from "./companion";
import {
  EMOTION_LABELS,
  MEMORY_EVENT_TYPES,
  PERSONALITY_DIMENSIONS,
  SNAPSHOT_SCHEMA_VERSION,
  type Snapshot,
  type SnapshotV1,
} from "./types";

export type SnapshotValidation =
  | { ok: true; snapshot: Snapshot }
  | { ok: false; kind: "unsupported-version" | "corrupt"; reason: string };

export type VersionedSnapshotValidation =
  | { ok: true; schemaVersion: 1; snapshot: SnapshotV1 }
  | { ok: true; schemaVersion: 2; snapshot: Snapshot }
  | { ok: false; kind: "unsupported-version" | "corrupt"; reason: string };

const EMOTION_SOURCES = ["ai", "manual", "corrected"] as const;
const DAY_KEY = /^\d{4}-\d{2}-\d{2}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isUnitInterval(value: unknown): value is number {
  return isFiniteNumber(value) && value >= 0 && value <= 1;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isFiniteNumber(value) && Number.isInteger(value) && value >= 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isNonEmptyString);
}

function fail(kind: "unsupported-version" | "corrupt", reason: string): { ok: false; kind: "unsupported-version" | "corrupt"; reason: string } {
  return { ok: false, kind, reason };
}

function validateDimensions(value: Record<string, unknown>, path: string): string | null {
  for (const key of ["valence", "arousal", "dominance", "intensity"]) {
    if (!isUnitInterval(value[key])) return `${path}.${key} 必须是 0–1 的有限数`;
  }
  return null;
}

function validateEmotion(value: unknown, path: string): string | null {
  if (!isRecord(value)) return `${path} 必须是对象`;
  if (!EMOTION_LABELS.includes(value.label as never)) return `${path}.label 非法`;
  const dimError = validateDimensions(value, path);
  if (dimError) return dimError;
  if (!EMOTION_SOURCES.includes(value.source as never)) return `${path}.source 非法`;
  const manual = value.source === "manual" || value.source === "corrected";
  if (manual ? value.confidence !== null : !isUnitInterval(value.confidence)) {
    return `${path}.confidence 与 source 不一致`;
  }
  return null;
}

function validateAnalysis(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (!isRecord(value)) return `${path} 必须是对象或 null`;
  if (value.schemaVersion !== 1) return `${path}.schemaVersion 必须为 1`;
  if (!EMOTION_LABELS.includes(value.label as never)) return `${path}.label 非法`;
  const dimError = validateDimensions(value, path);
  if (dimError) return dimError;
  if (!isUnitInterval(value.confidence)) return `${path}.confidence 必须是 0–1 的有限数`;
  return null;
}

function validateAnalysisMeta(value: unknown, path: string): string | null {
  if (value === null) return null;
  if (!isRecord(value)) return `${path} 必须是对象或 null`;
  for (const key of ["provider", "model", "mappingVersion"]) {
    if (!isNonEmptyString(value[key])) return `${path}.${key} 缺失`;
  }
  if (!isRecord(value.dimensionSources)) return `${path}.dimensionSources 必须是对象`;
  for (const source of Object.values(value.dimensionSources)) {
    if (!isNonEmptyString(source)) return `${path}.dimensionSources 含非法值`;
  }
  return null;
}

function validateCorrection(value: unknown, path: string): string | null {
  if (!isRecord(value)) return `${path} 必须是对象`;
  if (!isNonNegativeInteger(value.fromRevision) || !isNonNegativeInteger(value.toRevision)) {
    return `${path} 修订号非法`;
  }
  if (value.toRevision !== value.fromRevision + 1) return `${path} 修订号不连续`;
  if (!isFiniteNumber(value.correctedAt)) return `${path}.correctedAt 非法`;
  return (
    validateEmotion(value.previousEmotion, `${path}.previousEmotion`) ??
    validateEmotion(value.newEmotion, `${path}.newEmotion`) ??
    validateAnalysis(value.analysis, `${path}.analysis`) ??
    validateAnalysisMeta(value.analysisMeta, `${path}.analysisMeta`)
  );
}

function validateEntry(value: unknown, path: string): string | null {
  if (!isRecord(value)) return `${path} 必须是对象`;
  if (!isNonEmptyString(value.id)) return `${path}.id 缺失`;
  if (typeof value.text !== "string" || value.text.trim().length === 0) return `${path}.text 非法`;
  if (!isFiniteNumber(value.createdAt) || !isFiniteNumber(value.updatedAt)) return `${path} 时间非法`;
  if (!isNonEmptyString(value.dayKey) || !DAY_KEY.test(value.dayKey)) return `${path}.dayKey 非法`;
  if (!isNonNegativeInteger(value.revision)) return `${path}.revision 非法`;
  if (!isNonNegativeInteger(value.awardedXp)) return `${path}.awardedXp 非法`;
  if (!isNonEmptyString(value.rulesVersion)) return `${path}.rulesVersion 缺失`;
  if (!Array.isArray(value.corrections)) return `${path}.corrections 必须是数组`;
  for (const [index, correction] of value.corrections.entries()) {
    const error = validateCorrection(correction, `${path}.corrections[${index}]`);
    if (error) return error;
  }
  if (value.corrections.length > value.revision) return `${path} 纠正数量超过 revision`;
  return (
    validateEmotion(value.effectiveEmotion, `${path}.effectiveEmotion`) ??
    validateAnalysis(value.originalAnalysis, `${path}.originalAnalysis`) ??
    validateAnalysisMeta(value.analysisMeta, `${path}.analysisMeta`)
  );
}

function validateMemory(value: unknown, path: string): string | null {
  if (!isRecord(value)) return `${path} 必须是对象`;
  if (!isNonEmptyString(value.id)) return `${path}.id 缺失`;
  if (!MEMORY_EVENT_TYPES.includes(value.type as never)) return `${path}.type 非法`;
  if (value.entryId !== null && !isNonEmptyString(value.entryId)) return `${path}.entryId 非法`;
  if (!isFiniteNumber(value.occurredAt)) return `${path}.occurredAt 非法`;
  if (!isNonEmptyString(value.rulesVersion)) return `${path}.rulesVersion 缺失`;
  if (!isRecord(value.payload)) return `${path}.payload 必须是对象`;
  for (const item of Object.values(value.payload)) {
    if (item !== null && !["string", "number", "boolean"].includes(typeof item)) {
      return `${path}.payload 含非法结构`;
    }
    if (typeof item === "number" && !Number.isFinite(item)) return `${path}.payload 含非有限数`;
  }
  return null;
}

function validateSnapshotStructure(value: Record<string, unknown>): string | null {
  if (!isNonNegativeInteger(value.revision)) return "snapshot.revision 非法";
  const { character, decorations } = value;
  if (!isRecord(character)) return "character 必须是对象";
  if (!isNonNegativeInteger(character.totalXp)) return "character.totalXp 非法";
  if (!isNonNegativeInteger(character.stage)) return "character.stage 非法";
  if (character.latestEntryId !== null && !isNonEmptyString(character.latestEntryId)) {
    return "character.latestEntryId 非法";
  }
  if (character.currentEmotion !== null) {
    const error = validateEmotion(character.currentEmotion, "character.currentEmotion");
    if (error) return error;
  }
  if (!Array.isArray(value.entries)) return "entries 必须是数组";
  if (!isRecord(decorations)) return "decorations 必须是对象";
  if (!isStringArray(decorations.ownedIds)) return "decorations.ownedIds 非法";
  if (!isRecord(decorations.equippedBySlot)) return "decorations.equippedBySlot 必须是对象";
  if (!isRecord(decorations.hiddenById)) return "decorations.hiddenById 必须是对象";
  if (!Array.isArray(value.memories)) return "memories 必须是数组";
  if (!isStringArray(value.appliedEventIds)) return "appliedEventIds 非法";

  const entryIds = new Set<string>();
  for (const [index, entry] of value.entries.entries()) {
    const error = validateEntry(entry, `entries[${index}]`);
    if (error) return error;
    const id = (entry as { id: string }).id;
    if (entryIds.has(id)) return `entries 存在重复 id ${id}`;
    entryIds.add(id);
  }
  if (character.latestEntryId !== null && !entryIds.has(character.latestEntryId)) {
    return "character.latestEntryId 未指向已有日记";
  }
  if (character.currentEmotion !== null && character.latestEntryId === null) {
    return "无日记时不能存在当前心情";
  }

  const ownedIds = new Set(decorations.ownedIds);
  if (ownedIds.size !== decorations.ownedIds.length) return "ownedIds 存在重复物品";
  for (const [slot, itemId] of Object.entries(decorations.equippedBySlot)) {
    if (!isNonEmptyString(slot) || !isNonEmptyString(itemId)) return "equippedBySlot 键值非法";
    if (!ownedIds.has(itemId)) return `装备了未拥有的物品 ${itemId}`;
  }
  const equippedItems = Object.values(decorations.equippedBySlot);
  if (new Set(equippedItems).size !== equippedItems.length) return "同一物品装备在多个槽位";

  const memoryIds = new Set<string>();
  const hiddenMemoryIds = new Set<string>();
  for (const [index, memory] of value.memories.entries()) {
    const error = validateMemory(memory, `memories[${index}]`);
    if (error) return error;
    const { id, type, entryId } = memory as { id: string; type: string; entryId: string | null };
    if (memoryIds.has(id)) return `memories 存在重复 id ${id}`;
    memoryIds.add(id);
    if (type === "ITEM_HIDDEN") hiddenMemoryIds.add(id);
    if (entryId !== null && !entryIds.has(entryId)) return `回忆 ${id} 引用了不存在的日记`;
  }
  for (const [itemId, hidden] of Object.entries(decorations.hiddenById)) {
    if (!ownedIds.has(itemId)) return `隐藏了未拥有的物品 ${itemId}`;
    if (!isRecord(hidden)) return `hiddenById.${itemId} 必须是对象`;
    if (!isNonEmptyString(hidden.hiddenEventId) || !hiddenMemoryIds.has(hidden.hiddenEventId)) {
      return `hiddenById.${itemId} 隐藏事件不在回忆中`;
    }
    if (!isNonEmptyString(hidden.sourceEntryId) || !entryIds.has(hidden.sourceEntryId)) {
      return `hiddenById.${itemId} 来源日记不存在`;
    }
    if (!isNonEmptyString(hidden.slot) || !isNonEmptyString(hidden.reason) || !isFiniteNumber(hidden.hiddenAt)) {
      return `hiddenById.${itemId} 字段非法`;
    }
  }
  if (new Set(value.appliedEventIds).size !== value.appliedEventIds.length) {
    return "appliedEventIds 存在重复事件";
  }
  return null;
}

function validateCompanion(
  value: unknown,
  entries: Map<string, { dayKey: string; revision: number }>,
): string | null {
  if (!isRecord(value)) return "companion 必须是对象";
  if (!isNonEmptyString(value.companionRulesVersion)) return "companion.companionRulesVersion 缺失";
  if (!isRecord(value.contributions)) return "companion.contributions 必须是对象";
  const cap = PERSONALITY_PARAMS.dailyNetCap;
  for (const [entryId, contribution] of Object.entries(value.contributions)) {
    const path = `companion.contributions.${entryId}`;
    const entry = entries.get(entryId);
    if (!entry) return `${path} 引用了不存在的日记`;
    if (!isRecord(contribution)) return `${path} 必须是对象`;
    if (contribution.dayKey !== entry.dayKey) return `${path}.dayKey 必须沿用日记冻结值`;
    if (!EMOTION_LABELS.includes(contribution.label as never)) return `${path}.label 非法`;
    if (!isNonNegativeInteger(contribution.entryRevision) || contribution.entryRevision > entry.revision) {
      return `${path}.entryRevision 非法`;
    }
    if (!isRecord(contribution.deltas)) return `${path}.deltas 必须是对象`;
    for (const dimension of PERSONALITY_DIMENSIONS) {
      const delta = contribution.deltas[dimension];
      if (!isFiniteNumber(delta) || !Number.isInteger(delta) || Math.abs(delta) > cap) {
        return `${path}.deltas.${dimension} 必须是不超过单日上限的整数`;
      }
    }
  }
  if (!isRecord(value.habits)) return "companion.habits 必须是对象";
  for (const [habitId, habit] of Object.entries(value.habits)) {
    const path = `companion.habits.${habitId}`;
    if (!isRecord(habit)) return `${path} 必须是对象`;
    if (!isStringArray(habit.countedDayKeys) || !habit.countedDayKeys.every((key) => DAY_KEY.test(key))) {
      return `${path}.countedDayKeys 非法`;
    }
    if (new Set(habit.countedDayKeys).size !== habit.countedDayKeys.length) {
      return `${path}.countedDayKeys 存在重复日`;
    }
    if (!isNonNegativeInteger(habit.totalCount)) return `${path}.totalCount 非法`;
    if (habit.formedAt !== null && !isFiniteNumber(habit.formedAt)) return `${path}.formedAt 非法`;
  }
  if (!Array.isArray(value.world)) return "companion.world 必须是数组";
  const traceIds = new Set<string>();
  for (const [index, trace] of value.world.entries()) {
    const path = `companion.world[${index}]`;
    if (!isRecord(trace)) return `${path} 必须是对象`;
    if (!isNonEmptyString(trace.id)) return `${path}.id 缺失`;
    if (traceIds.has(trace.id)) return `${path}.id 重复`;
    traceIds.add(trace.id);
    if (trace.entryId !== null && !entries.has(trace.entryId as string)) {
      return `${path}.entryId 引用了不存在的日记`;
    }
    if (!isNonEmptyString(trace.dayKey) || !DAY_KEY.test(trace.dayKey)) return `${path}.dayKey 非法`;
    if (!isNonEmptyString(trace.kind)) return `${path}.kind 缺失`;
    if (!EMOTION_LABELS.includes(trace.label as never)) return `${path}.label 非法`;
    if (!isFiniteNumber(trace.createdAt)) return `${path}.createdAt 非法`;
  }
  return null;
}

function collectEntryIndex(value: Record<string, unknown>): Map<string, { dayKey: string; revision: number }> {
  const entries = new Map<string, { dayKey: string; revision: number }>();
  if (Array.isArray(value.entries)) {
    for (const entry of value.entries) {
      if (isRecord(entry) && isNonEmptyString(entry.id)) {
        entries.set(entry.id, {
          dayKey: typeof entry.dayKey === "string" ? entry.dayKey : "",
          revision: isNonNegativeInteger(entry.revision) ? entry.revision : -1,
        });
      }
    }
  }
  return entries;
}

export function validateSnapshotJson(raw: string): VersionedSnapshotValidation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return fail("corrupt", "存档不是合法 JSON");
  }
  if (!isRecord(parsed)) return fail("corrupt", "存档根节点必须是对象");
  if (!isFiniteNumber(parsed.schemaVersion)) return fail("corrupt", "存档缺少有效 schemaVersion");
  if (parsed.schemaVersion !== 1 && parsed.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    return fail("unsupported-version", `不支持的存档版本 ${parsed.schemaVersion}`);
  }
  const error = validateSnapshotStructure(parsed);
  if (error) return fail("corrupt", error);
  if (parsed.schemaVersion === 1) {
    return { ok: true, schemaVersion: 1, snapshot: parsed as unknown as SnapshotV1 };
  }
  const companionError = validateCompanion(parsed.companion, collectEntryIndex(parsed));
  if (companionError) return fail("corrupt", companionError);
  return { ok: true, schemaVersion: 2, snapshot: parsed as unknown as Snapshot };
}

export function validateSnapshot(value: unknown): SnapshotValidation {
  if (!isRecord(value)) return fail("corrupt", "存档根节点必须是对象");
  if (value.schemaVersion !== SNAPSHOT_SCHEMA_VERSION) {
    return fail("unsupported-version", "存档版本与当前 schema 不一致");
  }
  const error = validateSnapshotStructure(value);
  if (error) return fail("corrupt", error);
  const companionError = validateCompanion(value.companion, collectEntryIndex(value));
  if (companionError) return fail("corrupt", companionError);
  return { ok: true, snapshot: value as unknown as Snapshot };
}

export function serializeSnapshot(snapshot: Snapshot): string {
  return JSON.stringify(snapshot);
}