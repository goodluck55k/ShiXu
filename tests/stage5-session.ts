import assert from "node:assert/strict";
import type { Snapshot } from "../src/domain/types";

// 阶段五回归：久别重逢只在 SESSION_STARTED 正式保存成功后展示一次；
// 复用阶段四冻结/补交机制；回答/跳过零结算；刷新、StrictMode、救援与跨标签页冲突不重复/不提前展示。

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

interface ParsedSnapshot {
  revision: number;
  entries: unknown[];
  memories: unknown[];
  appliedEventIds: string[];
  personality: { contributions: Record<string, unknown> };
  offlineLife: { lastActiveAt: number | null; lastVisitAt: number | null; lastWindowStart: number | null; events: { id: string; windowStart: number }[] };
  reunion: { lastTriggeredWindowStart: number | null; lastTriggeredAt: number | null };
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

  async function mount(options: {
    fail?: boolean;
    revision?: number;
    startClock?: number;
    baseline?: number | null;
    raw?: string;
    rescue?: number | null;
    conflictOnSave?: boolean;
    strict?: boolean;
  }) {
    const seed = options.raw ? null : seedSnapshot(options.baseline ?? null, options.revision ?? 0);
    let raw: string | null = options.raw ?? serializeSnapshot(seed!);
    let fail = options.fail ?? false;
    let readCount = 0;
    const bumped = seed
      ? serializeSnapshot({ ...seed, revision: seed.revision + 10 })
      : raw;
    const session = new Map<string, string>();
    if (options.rescue !== undefined && options.rescue !== null) session.set("shixu.activityRescue", String(options.rescue));
    window.localStorage = {
      getItem: (k) => {
        if (k !== SNAPSHOT_STORAGE_KEY) return null;
        readCount += 1;
        if (options.conflictOnSave && readCount > 1) return bumped;
        return raw;
      },
      setItem: (k, v) => {
        if (fail) throw new Error("storage failed");
        if (options.conflictOnSave) throw new Error("unexpected save during conflict case");
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
      setFail: (v: boolean) => { fail = v; },
      advance: (ms: number) => { clock += ms; },
      async checkpoint() { await act(async () => { intervalCb?.(); for (let i = 0; i < 50; i++) await Promise.resolve(); }); },
      async storageEvent() {
        await act(async () => { window.dispatchEvent({ type: "storage", key: SNAPSHOT_STORAGE_KEY }); for (let i = 0; i < 50; i++) await Promise.resolve(); });
      },
      async unmount() { await act(async () => { root.unmount(); }); },
    };
  }

  const sessionIds = (ids: string[]) => ids.filter((id) => id.startsWith("session:"));

  // 场景 1：72 小时 + 1 毫秒成功启动 → 展示一次；回答/跳过后本会话不再出现；刷新不重复。
  {
    const baseline = BASE - OFFLINE_MS;
    const seed = seedSnapshot(baseline, 2);
    const seedRaw = serializeSnapshot(seed);
    const m = await mount({ revision: 2, baseline, startClock: BASE, raw: seedRaw });
    const prompt = ctx.state.reunionPrompt;
    assert.ok(prompt, "保存成功后应展示重逢问候");
    assert.equal(prompt!.windowStart, baseline);
    assert.equal(prompt!.question, REUNION_V1.baseQuestion);
    assert.equal(prompt!.dominantId, "gentleness");
    const snap = m.parsed();
    assert.equal(snap.revision, 3, "会话启动只提交一次");
    assert.deepEqual(snap.reunion, { lastTriggeredWindowStart: baseline, lastTriggeredAt: BASE });
    assert.equal(snap.offlineLife.lastVisitAt, BASE);
    assert.equal(snap.offlineLife.lastActiveAt, BASE);
    assert.equal(sessionIds(snap.appliedEventIds).length, 1);
    assert.equal(snap.entries.length, 0, "重逢不创建日记");
    assert.deepEqual(snap.personality.contributions, {}, "重逢不写性格贡献");

    await act(async () => { ctx.dismissReunion(); });
    await flush();
    assert.equal(ctx.state.reunionPrompt === null, true);
    assert.equal(ctx.state.reunionHandledWindow, baseline);

    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(ctx.state.reunionPrompt === null, true, "回答/跳过后同一会话不再出现");
    assert.equal(sessionIds(m.parsed().appliedEventIds).length, 1);
    const committed = m.raw();
    await m.unmount();

    const m2 = await mount({ startClock: BASE + 10 * MIN, raw: committed! });
    assert.equal(ctx.state.reunionPrompt === null, true, "刷新后不重复展示");
    assert.equal(m2.parsed().reunion.lastTriggeredWindowStart, baseline, "旧标记保留");
    assert.equal(m2.parsed().entries.length, 0);
    await m2.unmount();
  }

  // 场景 2：SESSION_STARTED 保存失败不展示；存储恢复后 checkpoint 补交窗口并展示一次。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ fail: true, revision: 3, baseline, startClock: BASE });
    assert.equal(ctx.state.reunionPrompt === null, true, "保存失败不得展示");
    assert.equal(m.parsed().revision, 3);
    assert.equal(m.parsed().reunion.lastTriggeredWindowStart, null);

    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(ctx.state.reunionPrompt === null, true, "存储未恢复时 checkpoint 不得补交");
    assert.equal(m.parsed().reunion.lastTriggeredWindowStart, null);

    m.setFail(false);
    m.advance(6 * MIN);
    await m.checkpoint();
    const prompt = ctx.state.reunionPrompt;
    assert.ok(prompt, "checkpoint 补交成功后展示重逢");
    assert.equal(prompt.windowStart, baseline);
    const after = m.parsed();
    assert.equal(after.revision, 4);
    assert.deepEqual(after.reunion, { lastTriggeredWindowStart: baseline, lastTriggeredAt: BASE }, "补交沿用冻结的会话时间");
    assert.equal(sessionIds(after.appliedEventIds).length, 1);
    assert.equal(after.offlineLife.events.length, 6);

    await act(async () => { ctx.dismissReunion(); });
    await flush();
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(ctx.state.reunionPrompt === null, true, "补交后关闭不重复出现");
    assert.equal(sessionIds(m.parsed().appliedEventIds).length, 1);
    await m.unmount();
  }

  // 场景 3：会话启动失败后日记保存补交 → 重逢与日记一次原子提交后展示一次。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ fail: true, revision: 2, baseline, startClock: BASE });
    m.setFail(false);
    let ok = false;
    await act(async () => { ok = await ctx.confirmEntry("离线之后的日记", createManualEmotion("calm")); });
    await flush();
    assert.equal(ok, true);
    assert.ok(ctx.state.reunionPrompt, "日记保存补交成功后展示重逢");
    const snap = m.parsed();
    assert.equal(snap.revision, 3, "会话窗口与日记一次提交");
    assert.equal(snap.entries.length, 1);
    assert.equal(Object.keys(snap.personality.contributions).length, 1, "只有日记产生贡献");
    assert.deepEqual(snap.reunion, { lastTriggeredWindowStart: baseline, lastTriggeredAt: BASE });
    await act(async () => { ctx.dismissReunion(); });
    await flush();
    assert.equal(ctx.state.reunionPrompt === null, true);
    assert.equal(m.parsed().entries.length, 1, "回答/跳过不写日记");
    await m.unmount();
  }

  // 场景 4：会话窗口未提交且日记保存也失败 → 不展示；retrySave 成功补交后展示一次。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ fail: true, revision: 2, baseline, startClock: BASE });
    let ok = true;
    await act(async () => { ok = await ctx.confirmEntry("失败时写日记", createManualEmotion("sadness")); });
    await flush();
    assert.equal(ok, false);
    assert.ok(ctx.state.pending);
    assert.equal(ctx.state.reunionPrompt === null, true, "日记保存失败不得提前展示重逢");

    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(ctx.state.reunionPrompt === null, true);
    assert.equal(m.parsed().revision, 2, "pending 期间 checkpoint 暂停");

    m.setFail(false);
    await act(async () => { ok = await ctx.retrySave(); });
    await flush();
    assert.equal(ok, true);
    assert.ok(ctx.state.reunionPrompt, "retrySave 补交成功后展示一次");
    const snap = m.parsed();
    assert.equal(snap.revision, 3);
    assert.equal(snap.entries.length, 1);
    assert.equal(sessionIds(snap.appliedEventIds).length, 1);
    assert.deepEqual(snap.reunion, { lastTriggeredWindowStart: baseline, lastTriggeredAt: BASE });
    await act(async () => { ctx.dismissReunion(); });
    await flush();
    assert.equal(ctx.state.reunionPrompt === null, true, "retry 后关闭不再出现");
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(ctx.state.reunionPrompt === null, true);
    await m.unmount();
  }

  // 场景 5：同标签页刷新救援值 → 旧快照基准不得被误判为长期离线。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE, rescue: BASE - 5 * MIN });
    assert.equal(ctx.state.reunionPrompt === null, true, "救援值应阻止刷新误触发");
    const snap = m.parsed();
    assert.equal(snap.revision, 3, "会话仍正常提交访问时间");
    assert.equal(snap.reunion.lastTriggeredWindowStart, null);
    assert.equal(snap.reunion.lastTriggeredAt, null);
    assert.equal(snap.offlineLife.events.length, 0, "刷新不伪造离线生活");
    await m.unmount();
  }

  // 场景 6：StrictMode 重复 effect 不产生第二次展示或第二次会话事件。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE, strict: true });
    const prompt = ctx.state.reunionPrompt;
    assert.ok(prompt, "StrictMode 下仍只展示一次");
    assert.equal(prompt.windowStart, baseline);
    assert.equal(sessionIds(m.parsed().appliedEventIds).length, 1, "StrictMode 不重复提交会话事件");
    assert.equal(m.parsed().revision, 3);
    await m.unmount();
  }

  // 场景 7：真实跨标签页 revision 冲突 → 不展示、不覆盖、不绕过冲突保护。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ revision: 2, baseline, startClock: BASE, conflictOnSave: true });
    assert.equal(ctx.state.tabConflict, true, "真实冲突应暂停提交");
    assert.equal(ctx.state.reunionPrompt === null, true, "冲突不得提前展示重逢");
    assert.equal(m.parsed().revision, 2, "不得覆盖其他标签页");
    assert.equal(m.parsed().reunion.lastTriggeredWindowStart, null);
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(ctx.state.reunionPrompt === null, true);
    assert.equal(m.parsed().revision, 2);
    await m.unmount();
  }

  // 场景 8：storage 事件触发冲突暂停 → 未提交窗口不得被 checkpoint 补交并展示。
  {
    const baseline = BASE - OFFLINE_MS;
    const m = await mount({ fail: true, revision: 2, baseline, startClock: BASE });
    assert.equal(ctx.state.reunionPrompt === null, true);
    await m.storageEvent();
    assert.equal(ctx.state.tabConflict, true);
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(ctx.state.reunionPrompt === null, true, "冲突暂停时不得展示重逢");
    assert.equal(m.parsed().revision, 2);
    await m.unmount();
  }

  // 场景 9：旧快照已有重逢标记 → 不因历史标记再次弹出；未触发会话保留原标记。
  {
    const baseline = BASE - OFFLINE_MS;
    const seed = seedSnapshot(baseline, 2);
    seed.offlineLife.lastWindowStart = baseline;
    seed.reunion = { lastTriggeredWindowStart: baseline, lastTriggeredAt: baseline + HOUR };
    const m = await mount({ revision: 2, raw: serializeSnapshot(seed), startClock: BASE });
    assert.equal(ctx.state.reunionPrompt === null, true, "历史触发标记不得再次弹出");
    const snap = m.parsed();
    assert.equal(snap.revision, 3);
    assert.deepEqual(snap.reunion, seed.reunion, "未触发时保留原重逢标记");
    await m.unmount();
  }

  // 场景 10：恰好 72 小时不触发（候选阈值严格大于），但会话仍正常提交。
  {
    const baseline = BASE - THRESHOLD;
    const m = await mount({ revision: 2, baseline, startClock: BASE });
    assert.equal(ctx.state.reunionPrompt === null, true, "恰好等于阈值不触发");
    assert.equal(m.parsed().revision, 3);
    assert.equal(m.parsed().reunion.lastTriggeredWindowStart, null);
    await m.unmount();
  }

  Date.now = realDateNow;
  console.log("阶段五回归通过：重逢仅保存后展示一次、失败补交、刷新/StrictMode/救援/冲突不重复或提前展示");
}
void main().catch((e) => { console.error(e); process.exit(1); });
