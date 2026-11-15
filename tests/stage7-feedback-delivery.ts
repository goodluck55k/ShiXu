import assert from "node:assert/strict";
import type { Snapshot } from "../src/domain/types";
import type { BehaviorRuntime } from "../src/application/useBehaviorRuntime";

// 保存反馈可靠投递回归：TTL、隐藏/挂载、重逢门控、StrictMode 与重挂载去重、连存只保留最新。

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
  setTimeout?: (cb: () => void, ms?: number) => number;
  clearTimeout?: (id: number) => void;
  matchMedia?: (query: string) => { matches: boolean; addEventListener(): void; removeEventListener(): void };
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
const HOUR = 60 * 60 * 1000;
const TTL = 300_000;

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
  window.setInterval = () => 1;
  window.clearInterval = () => {};
  window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });

  let clock = BASE;
  const timers = new Map<number, { at: number; cb: () => void }>();
  let timerId = 1;
  window.setTimeout = (cb, ms) => {
    const id = timerId++;
    timers.set(id, { at: clock + (ms ?? 0), cb });
    return id;
  };
  window.clearTimeout = (id) => { timers.delete(id); };

  const g = globalThis as unknown as Record<string, unknown>;
  g.window = window;
  g.document = document;
  g.IS_REACT_ACT_ENVIRONMENT = true;
  const realDateNow = Date.now;
  Date.now = () => clock;

  const { createRoot } = await import("react-dom/client");
  const { act, createElement, StrictMode } = await import("react");
  const { AppProvider, useApp } = await import("../src/application/AppProvider");
  const { useBehaviorRuntime } = await import("../src/application/useBehaviorRuntime");
  const { createManualEmotion } = await import("../src/domain/emotions");
  const { createInitialSnapshot } = await import("../src/domain/rules");
  const { serializeSnapshot } = await import("../src/domain/schema");
  const { SNAPSHOT_STORAGE_KEY } = await import("../src/lib/storage/localStorageAdapter");
  const { REUNION_V1 } = await import("../src/config/reunion");
  const { BEHAVIOR_V2 } = await import("../src/config/behavior");

  let app = null as unknown as ReturnType<typeof useApp>;
  let runtime = null as unknown as BehaviorRuntime;
  function AppHarness() {
    app = useApp();
    return null;
  }
  function RuntimeHarness() {
    runtime = useBehaviorRuntime();
    return null;
  }

  async function flush() {
    await act(async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); });
  }

  async function advance(ms: number) {
    await act(async () => {
      const target = clock + ms;
      for (let step = 0; step < 100; step++) {
        let nextId: number | null = null;
        let nextAt = Infinity;
        for (const [id, timer] of timers) {
          if (timer.at <= target && timer.at < nextAt) { nextId = id; nextAt = timer.at; }
        }
        if (nextId === null) break;
        const timer = timers.get(nextId)!;
        timers.delete(nextId);
        clock = timer.at;
        timer.cb();
        for (let i = 0; i < 20; i++) await Promise.resolve();
      }
      clock = target;
      for (let i = 0; i < 20; i++) await Promise.resolve();
    });
  }

  function baseSnapshot(revision = 0): Snapshot {
    return {
      ...createInitialSnapshot(),
      revision,
      offlineLife: { lastVisitAt: BASE, lastActiveAt: BASE, lastWindowStart: null, events: [] },
    };
  }

  async function mount(options: { snap?: Snapshot; raw?: string; strict?: boolean; visible?: boolean } = {}) {
    let raw: string | null = options.raw ?? serializeSnapshot(options.snap ?? baseSnapshot());
    let fail = false;
    const session = new Map<string, string>();
    window.localStorage = {
      getItem: (k) => (k === SNAPSHOT_STORAGE_KEY ? raw : null),
      setItem: (k, v) => { if (fail) throw new Error("storage failed"); if (k === SNAPSHOT_STORAGE_KEY) raw = v; },
      removeItem: (k) => { if (k === SNAPSHOT_STORAGE_KEY) raw = null; },
    };
    window.sessionStorage = {
      getItem: (k) => session.get(k) ?? null,
      setItem: (k, v) => { session.set(k, v); },
      removeItem: (k) => { session.delete(k); },
    };
    document.visibilityState = options.visible === false ? "hidden" : "visible";
    timers.clear();
    clock = BASE;

    let showRuntime = false;
    const container = makeNode(1, "DIV");
    container.ownerDocument = document;
    const root = createRoot(container as unknown as Element);
    const tree = () => createElement(AppProvider, null, createElement(AppHarness), showRuntime ? createElement(RuntimeHarness) : null);
    const render = async () => {
      await act(async () => { root.render(options.strict ? createElement(StrictMode, null, tree()) : tree()); });
      await flush();
    };
    await render();
    assert.equal(app.state.phase, "ready", "挂载后应就绪");

    return {
      raw: () => raw,
      setFail: (v: boolean) => { fail = v; },
      async setRuntime(v: boolean) { showRuntime = v; await render(); },
      async visibility(v: "visible" | "hidden") {
        document.visibilityState = v;
        await act(async () => { document.dispatchEvent({ type: "visibilitychange" }); for (let i = 0; i < 30; i++) await Promise.resolve(); });
        await flush();
      },
      async save(label: Parameters<typeof createManualEmotion>[0], text = "测试日记") {
        let ok = false;
        await act(async () => { ok = await app.confirmEntry(text, createManualEmotion(label)); });
        await flush();
        return ok;
      },
      async ack() {
        let ok = false;
        await act(async () => { ok = await app.dismissReunion(); });
        await flush();
        return ok;
      },
      async unmount() { await act(async () => { root.unmount(); }); },
    };
  }

  const isFeedback = () => runtime.feedbackActive && runtime.decision?.reasonCode === "save_feedback";

  // 1. 保存后进入企鹅页：反馈播放一次并按时结束。
  {
    const m = await mount();
    assert.equal(await m.save("calm"), true);
    await m.setRuntime(true);
    assert.equal(isFeedback(), true, "保存后进入企鹅页应投递反馈");
    await advance(BEHAVIOR_V2.saveFeedbackDurationMs);
    assert.equal(isFeedback(), false, "反馈结束后恢复普通行为");
    assert.equal(runtime.decision?.reasonCode !== "save_feedback", true);
    await m.unmount();
  }

  // 2. 超过 TTL 才进入企鹅页：直接丢弃，不延后补播。
  {
    const m = await mount();
    assert.equal(await m.save("joy"), true);
    await advance(TTL + 1);
    await m.setRuntime(true);
    assert.equal(isFeedback(), false, "过期反馈不得播放");
    await m.setRuntime(false);
    await m.setRuntime(true);
    assert.equal(isFeedback(), false, "过期反馈重挂载后也不得播放");
    await m.unmount();
  }

  // 3. 隐藏时挂载：不提前消费；恢复可见且未过期后投递一次。
  {
    const m = await mount();
    assert.equal(await m.save("tired"), true);
    await m.visibility("hidden");
    await m.setRuntime(true);
    assert.equal(isFeedback(), false, "隐藏时不得提前消费尚未展示的反馈");
    await advance(30_000);
    await m.visibility("visible");
    assert.equal(isFeedback(), true, "恢复可见后未过期反馈应启动");
    await advance(BEHAVIOR_V2.saveFeedbackDurationMs);
    assert.equal(isFeedback(), false);
    await m.unmount();
  }

  // 4. 反馈播放中隐藏，恢复后不重播；重挂载也不重复。
  {
    const m = await mount();
    assert.equal(await m.save("anxiety"), true);
    await m.setRuntime(true);
    assert.equal(isFeedback(), true);
    await advance(1_000);
    await m.visibility("hidden");
    await advance(1_000);
    await m.visibility("visible");
    assert.equal(isFeedback(), false, "已开始展示的反馈隐藏后不从头重播");
    await m.setRuntime(false);
    await m.setRuntime(true);
    assert.equal(isFeedback(), false, "重挂载不得重复播放已展示反馈");
    await advance(BEHAVIOR_V2.saveFeedbackDurationMs);
    assert.equal(isFeedback(), false);
    await m.unmount();
  }

  // 5. 存在待处理重逢问候：门控保存反馈；回应失败继续门控，成功落盘后才按 TTL 投递。
  {
    const pendingWindow = BASE - 200 * HOUR;
    const greeting = {
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
      offlineLife: { lastVisitAt: BASE - 73 * HOUR, lastActiveAt: BASE - 73 * HOUR, lastWindowStart: pendingWindow, events: [] },
      reunion: { lastTriggeredWindowStart: pendingWindow, lastTriggeredAt: pendingWindow + HOUR, pending: greeting },
    };
    const m = await mount({ snap });
    assert.ok(app.state.snapshot?.reunion.pending, "待处理问候应存在");
    assert.equal(await m.save("sadness"), true);
    await m.setRuntime(true);
    assert.equal(isFeedback(), false, "重逢问候未处理时不得展示保存反馈");

    m.setFail(true);
    assert.equal(await m.ack(), false);
    assert.ok(app.state.snapshot?.reunion.pending, "确认失败继续门控");
    assert.equal(isFeedback(), false, "确认失败时不得提前消费保存反馈");

    m.setFail(false);
    assert.equal(await m.ack(), true);
    assert.equal(app.state.snapshot?.reunion.pending, null, "确认成功后才清除问候");
    assert.equal(isFeedback(), true, "问候确认落盘后才投递未过期反馈");
    await m.unmount();
  }

  // 6. 重逢门控期间超过 TTL：确认成功后直接丢弃，不补播。
  {
    const pendingWindow = BASE - 200 * HOUR;
    const greeting = {
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
      offlineLife: { lastVisitAt: BASE - 73 * HOUR, lastActiveAt: BASE - 73 * HOUR, lastWindowStart: pendingWindow, events: [] },
      reunion: { lastTriggeredWindowStart: pendingWindow, lastTriggeredAt: pendingWindow + HOUR, pending: greeting },
    };
    const m = await mount({ snap });
    assert.equal(await m.save("calm"), true);
    await m.setRuntime(true);
    assert.equal(isFeedback(), false);
    await advance(TTL + 1);
    assert.equal(await m.ack(), true);
    assert.equal(isFeedback(), false, "门控等待计入有效期，过期不得补播");
    await m.unmount();
  }

  // 7. StrictMode 与重挂载：不重复播放。
  {
    const m = await mount({ strict: true });
    assert.equal(await m.save("joy"), true);
    await m.setRuntime(true);
    assert.equal(isFeedback(), true, "StrictMode 下正常投递一次");
    await m.setRuntime(false);
    await m.setRuntime(true);
    assert.equal(isFeedback(), false, "StrictMode 重挂载后不得重复");
    await m.unmount();
  }

  // 8. 连续成功保存：只保留最新一次反馈，不建立队列。
  {
    const m = await mount();
    assert.equal(await m.save("joy", "第一条"), true);
    assert.equal(await m.save("sadness", "第二条"), true);
    await m.setRuntime(true);
    assert.equal(isFeedback(), true, "只投递最新一次保存");
    assert.equal(runtime.decision?.expression, "sad", "反馈使用最新保存的情绪");
    assert.equal(await m.save("joy", "第三条"), true);
    assert.equal(isFeedback(), true, "播放中收到新保存时切换到最新反馈");
    assert.equal(runtime.decision?.expression, "happy", "播放中使用最新保存的情绪");
    await m.unmount();
  }

  Date.now = realDateNow;
  console.log("保存反馈可靠投递回归通过：TTL、隐藏恢复、重逢门控、StrictMode/重挂载、连存最新");
}

void main().catch((e) => { console.error(e); process.exit(1); });
