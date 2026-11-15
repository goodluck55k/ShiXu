import assert from "node:assert/strict";
import type { Snapshot } from "../src/domain/types";

// 阶段五回归（STO-05）：待处理问候持久化在正式快照中。
// 覆盖：日记页启动不消费、刷新/关闭重开不丢失、回应/跳过成功落盘才清除、
// 保存失败/空间不足保留重试、StrictMode、冲突、隐藏恢复、旧存档迁移不重播、
// 旧问候不被覆盖，且问候操作不新增日记/不修改五维贡献。

interface DomEvent { type: string; key?: string }
type Listener = (ev: DomEvent) => void;
interface FakeStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}
interface ShimNode {
  nodeType: number;
  nodeName: string;
  tagName: string;
  namespaceURI: string | null;
  style: Record<string, string>;
  childNodes: ShimNode[];
  children: ShimNode[];
  parentNode: ShimNode | null;
  ownerDocument: ShimNode | null;
  firstChild: ShimNode | null;
  nextSibling: ShimNode | null;
  textContent: string;
  addEventListener(type: string, fn: Listener): void;
  removeEventListener(type: string, fn: Listener): void;
  dispatchEvent(ev: DomEvent): boolean;
  appendChild(c: ShimNode): ShimNode;
  removeChild(c: ShimNode): ShimNode;
  insertBefore(c: ShimNode): ShimNode;
  setAttribute(): void;
  removeAttribute(): void;
  getAttribute(): null;
  contains(): boolean;
  getRootNode(): ShimNode;
  createElement?: (name: string) => ShimNode;
  createTextNode?: (t: string) => { nodeType: number; textContent: string };
  createComment?: (t: string) => { nodeType: number; textContent: string };
  documentElement?: ShimNode;
  head?: ShimNode;
  body?: ShimNode;
  visibilityState?: string;
  activeElement?: ShimNode | null;
  defaultView?: ShimNode;
  HTMLIFrameElement?: new () => unknown;
  localStorage?: FakeStorage;
  sessionStorage?: FakeStorage;
  setInterval?: (cb: () => void, ms: number) => number;
  clearInterval?: (id: number) => void;
  document?: ShimNode;
}

function makeNode(nodeType: number, nodeName: string): ShimNode {
  const listeners = new Map<string, Set<Listener>>();
  const node: ShimNode = {
    nodeType,
    nodeName,
    tagName: nodeName,
    namespaceURI: null,
    style: {},
    childNodes: [],
    children: [],
    parentNode: null,
    ownerDocument: null,
    firstChild: null,
    nextSibling: null,
    textContent: "",
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)!.add(fn);
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn);
    },
    dispatchEvent(ev) {
      for (const fn of listeners.get(ev.type) ?? []) fn(ev);
      return true;
    },
    appendChild(c) { node.childNodes.push(c); c.parentNode = node; return c; },
    removeChild(c) { node.childNodes = node.childNodes.filter((x) => x !== c); return c; },
    insertBefore(c) { node.childNodes.push(c); return c; },
    setAttribute() {},
    removeAttribute() {},
    getAttribute() { return null; },
    contains() { return false; },
    getRootNode() { return node; },
  };
  return node;
}

const BASE = 1_800_000_000_000;
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const OFFLINE_MS = 73 * HOUR;
const THRESHOLD = 72 * HOUR;

interface ParsedPending {
  windowStart: number;
  dominantId: string;
  tone: string;
  message: string;
  question: string;
  rulesVersion: string;
}
interface ParsedSnapshot {
  schemaVersion: number;
  revision: number;
  character: { latestEntryId: string | null };
  entries: { id: string; text: string }[];
  memories: unknown[];
  appliedEventIds: string[];
  personality: { contributions: Record<string, unknown> };
  offlineLife: { lastActiveAt: number | null; lastVisitAt: number | null; lastWindowStart: number | null; events: { id: string; windowStart: number }[] };
  reunion: { lastTriggeredWindowStart: number | null; lastTriggeredAt: number | null; pending: ParsedPending | null };
}

async function main() {
  const document = makeNode(9, "#document");
  document.createElement = (name) => makeNode(1, name.toUpperCase());
  document.createTextNode = (t) => ({ nodeType: 3, textContent: t });
  document.createComment = (t) => ({ nodeType: 8, textContent: t });
  document.documentElement = makeNode(1, "HTML");
  document.head = makeNode(1, "HEAD");
  document.body = makeNode(1, "BODY");
  document.visibilityState = "visible";
  document.activeElement = null;
  const window = makeNode(1, "WINDOW");
  window.document = document;
  document.defaultView = window;
  window.HTMLIFrameElement = class HTMLIFrameElement {};
  let intervalCb: (() => void) | null = null;
  window.setInterval = (cb) => { intervalCb = cb; return 1; };
  window.clearInterval = () => { intervalCb = null; };
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = window;
  g.document = document;
  g.IS_REACT_ACT_ENVIRONMENT = true;

  let clock = BASE;
  const realDateNow = Date.now;
  Date.now = () => clock;

  const { createRoot } = await import("react-dom/client");
  const { act, createElement, StrictMode } = await import("react");
  const { AppProvider, useApp } = await import("../src/application/AppProvider");
  const { createManualEmotion } = await import("../src/domain/emotions");
  const { createInitialSnapshot } = await import("../src/domain/rules");
  const { serializeSnapshot } = await import("../src/domain/schema");
  const { REUNION_V1 } = await import("../src/config/reunion");
  const { SNAPSHOT_STORAGE_KEY } = await import("../src/lib/storage/localStorageAdapter");

  let ctx = null as unknown as ReturnType<typeof useApp>;
  function Harness() { ctx = useApp(); return null; }

  async function flush() {
    await act(async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); });
  }

  function seedSnapshot(baseline: number | null, revision: number): Snapshot {
    return {
      ...createInitialSnapshot(),
      revision,
      offlineLife: { lastVisitAt: baseline, lastActiveAt: baseline, lastWindowStart: null, events: [] },
    };
  }

  function pendingOf() { return ctx.state.snapshot?.reunion.pending ?? null; }

  async function mount(options: {
    fail?: boolean;
    quota?: boolean;
    revision?: number;
    startClock?: number;
    baseline?: number | null;
    raw?: string;
    snap?: Snapshot;
    rescue?: number | null;
    conflictOnSave?: boolean;
    strict?: boolean;
  }) {
    const seed = options.raw ? null : (options.snap ?? seedSnapshot(options.baseline ?? null, options.revision ?? 0));
    let raw: string | null = options.raw ?? serializeSnapshot(seed!);
    let fail = options.fail ?? false;
    let quota = options.quota ?? false;
    let conflictOnSave = options.conflictOnSave ?? false;
    let readCount = 0;
    const bumpedRaw = (): string | null => {
      if (raw === null) return null;
      try {
        const parsed = JSON.parse(raw) as { revision?: number };
        parsed.revision = (parsed.revision ?? 0) + 10;
        return JSON.stringify(parsed);
      } catch {
        return raw;
      }
    };
    const session = new Map<string, string>();
    if (options.rescue !== undefined && options.rescue !== null) session.set("shixu.activityRescue", String(options.rescue));
    window.localStorage = {
      getItem: (k) => {
        if (k !== SNAPSHOT_STORAGE_KEY) return null;
        readCount += 1;
        if (conflictOnSave && readCount > 1) return bumpedRaw();
        return raw;
      },
      setItem: (k, v) => {
        if (fail) throw new Error("storage failed");
        if (quota) throw new DOMException("quota exceeded", "QuotaExceededError");
        if (k === SNAPSHOT_STORAGE_KEY) raw = v;
      },
      removeItem: (k) => { if (k === SNAPSHOT_STORAGE_KEY) raw = null; },
    };
    window.sessionStorage = {
      getItem: (k) => session.get(k) ?? null,
      setItem: (k, v) => { session.set(k, v); },
      removeItem: (k) => { session.delete(k); },
    };
    document.visibilityState = "visible";
    intervalCb = null;
    clock = options.startClock ?? BASE;
    const container = makeNode(1, "DIV");
    container.ownerDocument = document;
    const root = createRoot(container as unknown as Element);
    const tree = createElement(AppProvider, null, createElement(Harness));
    await act(async () => { root.render(options.strict ? createElement(StrictMode, null, tree) : tree); });
    await flush();
    await flush();
    assert.equal(ctx.state.phase, "ready", "挂载后应就绪");
    return {
      raw: () => raw,
      parsed: (): ParsedSnapshot => JSON.parse(raw!) as ParsedSnapshot,
      pending: pendingOf,
      setFail: (v: boolean) => { fail = v; },
      setQuota: (v: boolean) => { quota = v; },
      setConflict: (v: boolean) => { conflictOnSave = v; },
      advance: (ms: number) => { clock += ms; },
      async checkpoint() { await act(async () => { intervalCb?.(); for (let i = 0; i < 50; i++) await Promise.resolve(); }); },
      async storageEvent() {
        await act(async () => { window.dispatchEvent({ type: "storage", key: SNAPSHOT_STORAGE_KEY }); for (let i = 0; i < 50; i++) await Promise.resolve(); });
      },
      async ack() {
        let ok = false;
        await act(async () => { ok = await ctx.dismissReunion(); });
        await flush();
        return ok;
      },
      async reload() { await act(async () => { await ctx.reload(); }); await flush(); },
      async unmount() { await act(async () => { root.unmount(); }); },
    };
  }

  const sessionIds = (ids: string[]) => ids.filter((id) => id.startsWith("session:"));

  // 场景 1：长期离线后从日记页进入（未渲染问候）→ 状态持久化且不被消费；
  // 进入企鹅页后可见；回应成功落盘后才清除；重开不重复。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE });
    const prompt = m.pending();
    assert.ok(prompt, "会话保存成功后待处理问候应随快照持久化");
    assert.equal(prompt!.windowStart, baseline);
    assert.equal(prompt!.question, REUNION_V1.baseQuestion);
    assert.equal(prompt!.dominantId, "gentleness");

    const snap = m.parsed();
    assert.equal(snap.schemaVersion, 4);
    assert.equal(snap.revision, 3, "会话启动只提交一次");
    assert.equal(snap.reunion.lastTriggeredWindowStart, baseline);
    assert.equal(snap.reunion.lastTriggeredAt, BASE);
    assert.deepEqual(snap.reunion.pending, prompt, "待处理问候写入正式存档");
    assert.equal(snap.entries.length, 0, "重逢不创建日记");
    assert.deepEqual(snap.personality.contributions, {}, "重逢不写性格贡献");
    assert.equal(sessionIds(snap.appliedEventIds).length, 1);

    // 日记页期间 checkpoint / 页面隐藏不应消费问候。
    m.advance(6 * MIN);
    document.visibilityState = "hidden";
    await m.checkpoint();
    document.visibilityState = "visible";
    await m.checkpoint();
    assert.deepEqual(m.pending(), prompt, "未进入企鹅页不得自动消费问候");
    assert.deepEqual(m.parsed().reunion.pending, prompt, "checkpoint 后仍保留");

    // 进入企鹅页，明确回应。
    assert.equal(await m.ack(), true, "回应保存成功");
    assert.equal(m.pending(), null);
    const after = m.parsed();
    assert.equal(after.reunion.pending, null, "处理结果成功持久化后才清除");
    assert.equal(after.reunion.lastTriggeredWindowStart, baseline, "已处理仍保留触发标记");
    assert.equal(after.entries.length, 0, "回应不写日记");
    assert.deepEqual(after.personality.contributions, {}, "回应不改五维贡献");
    assert.equal(after.memories.length, 0, "回应不写回忆");

    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(m.pending(), null, "处理成功后不再出现");
    const committed = m.raw();
    await m.unmount();

    const m2 = await mount({ startClock: BASE + 10 * MIN, raw: committed! });
    assert.equal(m2.pending(), null, "刷新/重开不重复");
    assert.equal(m2.parsed().reunion.lastTriggeredWindowStart, baseline, "旧标记保留");
    await m2.unmount();
  }

  // 场景 2：问候展示前刷新 / 关闭后重新打开：待处理状态仍在，不重复触发、不覆盖。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE });
    const prompt = m.pending();
    assert.ok(prompt);
    const committed = m.raw();
    await m.unmount();

    const m2 = await mount({ startClock: BASE + 10 * MIN, raw: committed! });
    assert.deepEqual(m2.pending(), prompt, "刷新后待处理问候仍在");
    assert.equal(m2.parsed().reunion.lastTriggeredWindowStart, baseline, "不重复触发新窗口");

    const midRaw = m2.raw();
    await m2.unmount();
    // 即便超过 72 小时，旧问候未处理时也不得被新触发覆盖。
    const m3 = await mount({ startClock: BASE + OFFLINE_MS + HOUR, raw: midRaw! });
    assert.deepEqual(m3.pending(), prompt, "关闭重开且再次长期离线也不覆盖旧问候");
    assert.equal(m3.parsed().reunion.lastTriggeredWindowStart, baseline, "旧触发窗口保持不变");
    assert.equal(await m3.ack(), true);
    assert.equal(m3.pending(), null);
    await m3.unmount();
  }

  // 场景 3：会话启动保存失败 → 不产生待处理问候；checkpoint 补交后才持久化。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ fail: true, revision: 3, baseline, startClock: BASE });
    assert.equal(m.pending(), null, "保存失败不得提前产生问候");
    assert.equal(m.parsed().revision, 3);
    assert.equal(m.parsed().reunion.lastTriggeredWindowStart, null);

    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(m.pending(), null, "存储未恢复时 checkpoint 不得补交");

    m.setFail(false);
    m.advance(6 * MIN);
    await m.checkpoint();
    const prompt = m.pending();
    assert.ok(prompt, "补交成功后问候持久化");
    assert.equal(prompt!.windowStart, baseline);
    const after = m.parsed();
    assert.equal(after.revision, 4);
    assert.equal(after.reunion.lastTriggeredWindowStart, baseline);
    assert.equal(after.reunion.lastTriggeredAt, BASE, "补交沿用冻结的会话时间");
    assert.deepEqual(after.reunion.pending, prompt);
    assert.equal(sessionIds(after.appliedEventIds).length, 1);

    assert.equal(await m.ack(), true);
    await m.unmount();
  }

  // 场景 4：会话启动失败后日记保存补交 → 问候与日记一次原子提交。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ fail: true, revision: 2, baseline, startClock: BASE });
    m.setFail(false);
    let ok = false;
    await act(async () => { ok = await ctx.confirmEntry("离线之后的日记", createManualEmotion("calm")); });
    await flush();
    assert.equal(ok, true);
    assert.ok(m.pending(), "日记保存补交成功后问候持久化");
    const snap = m.parsed();
    assert.equal(snap.revision, 3, "会话窗口与日记一次提交");
    assert.equal(snap.entries.length, 1);
    assert.equal(Object.keys(snap.personality.contributions).length, 1, "只有日记产生贡献");
    assert.equal(snap.reunion.lastTriggeredWindowStart, baseline);
    assert.equal(await m.ack(), true);
    assert.equal(m.parsed().entries.length, 1, "回应不写日记");
    await m.unmount();
  }

  // 场景 5：回应/跳过保存失败 → 问候保留可重试；空间不足同样保留。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE });
    const prompt = m.pending();
    assert.ok(prompt);
    const revisionBefore = m.parsed().revision;

    m.setFail(true);
    assert.equal(await m.ack(), false, "保存失败不得假装已处理");
    assert.deepEqual(m.pending(), prompt, "失败后问候仍在界面状态");
    assert.deepEqual(m.parsed().reunion.pending, prompt, "失败后存档仍保留待处理");
    assert.equal(m.parsed().revision, revisionBefore);

    m.setFail(false);
    assert.equal(await m.ack(), true, "恢复后重试成功");
    assert.equal(m.pending(), null);
    assert.equal(m.parsed().reunion.pending, null);

    // 空间不足：同样保留并允许重试。
    const m2 = await mount({ revision: 2, baseline, startClock: BASE + HOUR });
    const prompt2 = m2.pending();
    assert.ok(prompt2);
    const beforeQuota = m2.parsed().revision;
    m2.setQuota(true);
    assert.equal(await m2.ack(), false);
    assert.deepEqual(m2.pending(), prompt2);
    assert.deepEqual(m2.parsed().reunion.pending, prompt2);
    assert.equal(m2.parsed().revision, beforeQuota);
    assert.ok((ctx.state.saveError ?? "").includes("空间不足"), "空间不足应给出真实失败提示");
    m2.setQuota(false);
    assert.equal(await m2.ack(), true);
    assert.equal(m2.pending(), null);
    await m2.unmount();
  }

  // 场景 6：StrictMode 重复 effect 不重复提交、不重复问候；处理后重开不重复。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE, strict: true });
    const prompt = m.pending();
    assert.ok(prompt, "StrictMode 下仍只有待处理问候");
    assert.equal(prompt!.windowStart, baseline);
    assert.equal(sessionIds(m.parsed().appliedEventIds).length, 1, "StrictMode 不重复提交会话事件");
    assert.equal(m.parsed().revision, 3);
    assert.equal(await m.ack(), true);
    assert.equal(m.pending(), null);
    const raw = m.raw();
    await m.unmount();
    const m2 = await mount({ startClock: BASE + 10 * MIN, raw: raw!, strict: true });
    assert.equal(m2.pending(), null, "处理后重开不重复");
    await m2.unmount();
  }

  // 场景 7：跨标签页冲突暂停 → 不提前清除；重新加载后待处理仍在，可再次回应。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE });
    const prompt = m.pending();
    assert.ok(prompt);

    m.setConflict(true);
    assert.equal(await m.ack(), false, "真实修订冲突不得覆盖其他标签页");
    assert.deepEqual(m.pending(), prompt, "冲突后界面仍保留问候");
    assert.deepEqual(m.parsed().reunion.pending, prompt, "冲突后存档仍保留待处理");
    assert.equal(ctx.state.tabConflict, true);
    m.setConflict(false);

    await m.reload();
    assert.equal(ctx.state.tabConflict, false);
    assert.deepEqual(m.pending(), prompt, "重新加载后待处理问候仍可展示");
    assert.equal(await m.ack(), true);
    assert.equal(m.pending(), null);

    // storage 事件暂停提交：同样不得假装处理成功。
    const m2 = await mount({ revision: 2, baseline, startClock: BASE + HOUR });
    const prompt2 = m2.pending();
    assert.ok(prompt2);
    await m2.storageEvent();
    assert.equal(ctx.state.tabConflict, true);
    assert.equal(await m2.ack(), false);
    assert.deepEqual(m2.parsed().reunion.pending, prompt2);
    await m2.unmount();
    await m.unmount();
  }

  // 场景 8：旧 v3 存档已标记触发但没有待处理信息 → 迁移不猜造、不重播；历史日记保留。
  {
    const entry = {
      id: "legacy-entry",
      text: "旧日记原文",
      createdAt: BASE - 20 * HOUR,
      updatedAt: BASE - 20 * HOUR,
      dayKey: "2026-11-12",
      revision: 0,
      originalAnalysis: null,
      analysisMeta: null,
      effectiveEmotion: { label: "calm", valence: 0.5, arousal: 0.5, dominance: 0.5, intensity: 0.5, confidence: null, source: "manual" },
      corrections: [],
      awardedXp: 0,
      rulesVersion: "rules-v1",
    };
    const v3 = {
      ...createInitialSnapshot(),
      schemaVersion: 3,
      revision: 2,
      character: { latestEntryId: entry.id, currentEmotion: entry.effectiveEmotion },
      entries: [entry],
      reunion: { lastTriggeredWindowStart: BASE - 10 * HOUR, lastTriggeredAt: BASE - 9 * HOUR },
      offlineLife: { lastVisitAt: BASE - HOUR, lastActiveAt: BASE - HOUR, lastWindowStart: BASE - 10 * HOUR, events: [] },
    };
    const raw = JSON.stringify(v3);
    const m = await mount({ raw, startClock: BASE });
    assert.equal(m.pending(), null, "旧存档不得被猜造为待处理并重播");
    const parsed = m.parsed();
    assert.equal(parsed.schemaVersion, 4, "成功保存后迁移为 v4");
    assert.equal(parsed.reunion.pending, null);
    assert.equal(parsed.reunion.lastTriggeredWindowStart, BASE - 10 * HOUR, "旧触发标记原样保留");
    assert.equal(parsed.entries.length, 1);
    assert.equal(parsed.entries[0].text, "旧日记原文", "迁移不改历史正文");
    await m.unmount();
  }

  // 场景 9：待处理旧问候阻断新触发、不被覆盖；处理后新的离线窗口可正常触发。
  {
    const pendingWindow = BASE - 200 * HOUR;
    const oldGreeting = {
      windowStart: pendingWindow,
      dominantId: "gentleness" as const,
      tone: REUNION_V1.templates.gentleness.tone,
      message: REUNION_V1.templates.gentleness.generic,
      question: REUNION_V1.baseQuestion,
      rulesVersion: "reunion-v1",
    };
    const snap: Snapshot = {
      ...createInitialSnapshot(),
      revision: 2,
      offlineLife: { lastVisitAt: BASE - OFFLINE_MS, lastActiveAt: BASE - OFFLINE_MS, lastWindowStart: pendingWindow, events: [] },
      reunion: { lastTriggeredWindowStart: pendingWindow, lastTriggeredAt: pendingWindow + HOUR, pending: oldGreeting },
    };
    const m = await mount({ snap, startClock: BASE });
    assert.deepEqual(m.pending(), oldGreeting, "旧待处理问候保持不变");
    assert.equal(m.parsed().reunion.lastTriggeredWindowStart, pendingWindow, "不得改记新窗口");
    assert.equal(m.parsed().revision, 3, "会话访问仍正常提交");

    assert.equal(await m.ack(), true);
    assert.equal(m.pending(), null);
    const raw = m.raw();
    await m.unmount();

    // 处理完成后的新离线窗口可以正常触发新问候。
    const m2 = await mount({ startClock: BASE + OFFLINE_MS + HOUR, raw: raw! });
    const next = m2.pending();
    assert.ok(next, "旧问候处理后允许新窗口触发");
    assert.equal(next!.windowStart, BASE, "新问候使用新窗口起点");
    assert.equal(m2.parsed().reunion.lastTriggeredWindowStart, BASE);
    await m2.unmount();
  }

  // 场景 10：同标签页刷新救援值阻止误触发；恰好 72 小时不触发。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE, rescue: BASE - 5 * MIN });
    assert.equal(m.pending(), null, "救援值应阻止刷新误触发");
    assert.equal(m.parsed().revision, 3);
    assert.equal(m.parsed().reunion.lastTriggeredWindowStart, null);
    await m.unmount();

    const exact = await mount({ revision: 2, baseline: BASE - THRESHOLD, startClock: BASE });
    assert.equal(exact.pending(), null, "恰好等于阈值不触发");
    assert.equal(exact.parsed().revision, 3);
    assert.equal(exact.parsed().reunion.lastTriggeredWindowStart, null);
    await exact.unmount();
  }

  Date.now = realDateNow;
  console.log("STO-05 回归通过：问候持久化、跨刷新/重开投递、失败重试、迁移不重播、旧问候不被覆盖");
}
void main().catch((e) => { console.error(e); process.exit(1); });
