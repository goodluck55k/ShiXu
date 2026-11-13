import assert from "node:assert/strict";

// 阶段四 P1 回归：会话启动 SESSION_STARTED 保存失败后，未提交的离线窗口必须随 checkpoint 或日记保存一并补交；
// 离线事件只在正式保存成功后展示，且不重复、不丢失。零依赖最小 DOM shim 直接渲染 AppProvider。

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
const OFFLINE_MS = 5 * HOUR;

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
  const { act, createElement } = await import("react");
  const { AppProvider, useApp } = await import("../src/application/AppProvider");
  const { createManualEmotion } = await import("../src/domain/emotions");
  const { createInitialSnapshot } = await import("../src/domain/rules");
  const { serializeSnapshot } = await import("../src/domain/schema");
  const { SNAPSHOT_STORAGE_KEY } = await import("../src/lib/storage/localStorageAdapter");

  let ctx = null as unknown as ReturnType<typeof useApp>;
  function Harness() { ctx = useApp(); return null; }

  async function flush() {
    await act(async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); });
  }

  const baseline = BASE - OFFLINE_MS;

  // 预置 5 小时离线窗口的正式存档；首次 SESSION_STARTED 保存可被 fake localStorage 阻断。
  async function mount(options: { fail: boolean; revision: number; startClock: number; raw?: string }) {
    if (!options.raw) {
      const seed = {
        ...createInitialSnapshot(),
        revision: options.revision,
        offlineLife: { lastVisitAt: baseline, lastActiveAt: baseline, lastWindowStart: null, events: [] },
      };
      options.raw = serializeSnapshot(seed);
    }
    let raw: string | null = options.raw;
    let fail = options.fail;
    window.localStorage = {
      getItem: (k) => (k === SNAPSHOT_STORAGE_KEY ? raw : null),
      setItem: (k, v) => { if (fail) throw new Error("storage failed"); if (k === SNAPSHOT_STORAGE_KEY) raw = v; },
      removeItem: (k) => { if (k === SNAPSHOT_STORAGE_KEY) raw = null; },
    };
    window.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    document.visibilityState = "visible";
    intervalCb = null;
    clock = options.startClock;
    const container = makeNode(1, "DIV");
    container.ownerDocument = document;
    const root = createRoot(container as unknown as Element);
    await act(async () => { root.render(createElement(AppProvider, null, createElement(Harness))); });
    await flush();
    await flush();
    assert.equal(ctx.state.phase, "ready", "挂载后应就绪");
    return {
      raw: () => raw,
      parsed: () => JSON.parse(raw!) as { revision: number; entries: unknown[]; appliedEventIds: string[]; personality: { contributions: Record<string, unknown> }; offlineLife: { lastActiveAt: number | null; lastVisitAt: number | null; lastWindowStart: number | null; events: { id: string; windowStart: number }[] } },
      setFail: (v: boolean) => { fail = v; },
      advance: (ms: number) => { clock += ms; },
      async checkpoint() { await act(async () => { intervalCb?.(); for (let i = 0; i < 50; i++) await Promise.resolve(); }); },
      async unmount() { await act(async () => { root.unmount(); }); },
    };
  }

  const sessionIds = (ids: string[]) => ids.filter((id) => id.startsWith("session:"));
  const uniqueIds = (events: { id: string }[]) => new Set(events.map((e) => e.id)).size;

  // 场景 1：SESSION_STARTED 保存失败 → 存储仍不可用时 checkpoint 不推进 → 恢复后 checkpoint 补交窗口 → 不重复。
  {
    const m = await mount({ fail: true, revision: 3, startClock: BASE });
    assert.equal(m.parsed().revision, 3, "会话启动保存失败不得推进 revision");
    assert.equal(m.parsed().offlineLife.events.length, 0, "未提交的离线事件不落盘");
    assert.equal(ctx.state.snapshot!.offlineLife.events.length, 0, "未提交的离线事件不展示");
    assert.equal(ctx.state.snapshot!.revision, 3);

    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(m.parsed().revision, 3, "存储未恢复时 checkpoint 不得推进 lastActiveAt");
    assert.equal(m.parsed().offlineLife.lastActiveAt, baseline, "窗口起点不得被跳过");
    assert.equal(m.parsed().offlineLife.events.length, 0);

    m.setFail(false);
    m.advance(6 * MIN);
    await m.checkpoint();
    const after = m.parsed();
    assert.equal(after.revision, 4, "恢复后 checkpoint 一次性提交会话窗口");
    assert.equal(after.offlineLife.events.length, 3, "5 小时窗口生成 3 条离线事件");
    assert.ok(after.offlineLife.events.every((e) => e.windowStart === baseline), "事件归属原始窗口");
    assert.equal(after.offlineLife.lastWindowStart, baseline);
    assert.equal(after.offlineLife.lastActiveAt, BASE + 12 * MIN, "仅 checkpoint 自己推进一次");
    assert.equal(sessionIds(after.appliedEventIds).length, 1, "会话事件只记录一次");
    assert.equal(ctx.state.snapshot!.offlineLife.events.length, 3, "正式保存后才展示离线事件");

    m.advance(6 * MIN);
    await m.checkpoint();
    const again = m.parsed();
    assert.equal(again.revision, 5);
    assert.equal(again.offlineLife.events.length, 3, "后续 checkpoint 不重复写入离线事件");
    assert.equal(uniqueIds(again.offlineLife.events), 3);
    assert.equal(sessionIds(again.appliedEventIds).length, 1);
    await m.unmount();
  }

  // 场景 2：失败后先恢复存储并保存日记 → 日记候选必须携带未提交窗口，事件不丢失。
  {
    const m = await mount({ fail: true, revision: 3, startClock: BASE });
    m.setFail(false);
    let ok = false;
    await act(async () => { ok = await ctx.confirmEntry("离线之后写的日记", createManualEmotion("calm")); });
    await flush();
    assert.equal(ok, true, "存储恢复后日记应保存成功");
    const snap = m.parsed();
    assert.equal(snap.revision, 4, "会话窗口与日记一次原子提交");
    assert.equal(snap.entries.length, 1);
    assert.equal(snap.offlineLife.events.length, 3, "日记保存不得覆盖离线窗口");
    assert.ok(snap.offlineLife.events.every((e) => e.windowStart === baseline));
    assert.equal(snap.offlineLife.lastWindowStart, baseline);
    assert.equal(snap.offlineLife.lastActiveAt, BASE, "日记保存时间");
    assert.equal(sessionIds(snap.appliedEventIds).length, 1);
    assert.equal(Object.keys(snap.personality.contributions).length, 1, "不重复结算性格");

    m.advance(6 * MIN);
    await m.checkpoint();
    const after = m.parsed();
    assert.equal(after.revision, 5);
    assert.equal(after.offlineLife.events.length, 3, "日记保存后 checkpoint 不复制离线事件");
    assert.equal(uniqueIds(after.offlineLife.events), 3);
    await m.unmount();
  }

  // 场景 3：会话窗口未提交时日记保存也失败 → checkpoint 冻结 → retrySave 一次补交窗口与日记。
  {
    const m = await mount({ fail: true, revision: 3, startClock: BASE });
    let ok = true;
    await act(async () => { ok = await ctx.confirmEntry("失败时写日记", createManualEmotion("sadness")); });
    await flush();
    assert.equal(ok, false);
    assert.ok(ctx.state.pending, "失败的日记保留 pending 供重试");
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(m.parsed().revision, 3, "pending 期间 checkpoint 暂停");
    assert.equal(m.parsed().offlineLife.events.length, 0);

    m.setFail(false);
    await act(async () => { ok = await ctx.retrySave(); });
    await flush();
    assert.equal(ok, true, "存储恢复后 retrySave 成功");
    const snap = m.parsed();
    assert.equal(snap.revision, 4);
    assert.equal(snap.entries.length, 1);
    assert.equal(snap.offlineLife.events.length, 3, "重试补交未提交的离线窗口");
    assert.ok(snap.offlineLife.events.every((e) => e.windowStart === baseline));
    assert.equal(snap.offlineLife.lastActiveAt, BASE, "重试保留冻结的 now");
    assert.equal(sessionIds(snap.appliedEventIds).length, 1);
    assert.equal(uniqueIds(snap.offlineLife.events), 3);
    await m.unmount();
  }

  // 场景 4：补交后刷新（重新挂载）→ 旧窗口不重放、不重复，短间隔不伪造离线生活。
  {
    const m = await mount({ fail: true, revision: 3, startClock: BASE });
    m.setFail(false);
    m.advance(6 * MIN);
    await m.checkpoint();
    const committed = m.parsed();
    assert.equal(committed.revision, 4);
    assert.equal(committed.offlineLife.events.length, 3);
    const raw = m.raw();
    await m.unmount();

    const m2 = await mount({ fail: false, revision: 0, startClock: BASE + 10 * MIN, raw: raw ?? undefined });
    const reloaded = m2.parsed();
    assert.equal(reloaded.revision, 5, "刷新后会话只提交访问时间");
    assert.equal(reloaded.offlineLife.events.length, 3, "刷新不丢失已提交的离线事件");
    assert.equal(uniqueIds(reloaded.offlineLife.events), 3, "刷新不重复离线事件");
    await m2.unmount();
  }

  Date.now = realDateNow;
  console.log("阶段四 P1 回归通过：会话启动保存失败后窗口随 checkpoint/日记/重试补交，不丢失、不重复");
}
void main().catch((e) => { console.error(e); process.exit(1); });
