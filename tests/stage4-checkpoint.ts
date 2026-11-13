import assert from "node:assert/strict";

// 阶段四 P1 回归：pending 日记未解决时 checkpoint 不得推进 revision；解决/取消后恢复；跨标签页冲突保护不被绕过。
// 零依赖：最小 DOM shim 直接渲染 AppProvider（react-dom/client + act），fake localStorage 控制保存失败与恢复。

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
  window.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
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
  const { derivePersonality } = await import("../src/domain/personality");
  const { applyGameEvent } = await import("../src/domain/rules");
  const { serializeSnapshot } = await import("../src/domain/schema");
  const { SNAPSHOT_STORAGE_KEY } = await import("../src/lib/storage/localStorageAdapter");

  let ctx = null as unknown as ReturnType<typeof useApp>;
  function Harness() { ctx = useApp(); return null; }

  async function flush() {
    await act(async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); });
  }
  const revisionOf = (raw: string | null) => (raw === null ? 0 : JSON.parse(raw).revision);

  async function mount() {
    let raw: string | null = null;
    let fail = false;
    window.localStorage = {
      getItem: (k) => (k === SNAPSHOT_STORAGE_KEY ? raw : null),
      setItem: (k, v) => { if (fail) throw new Error("storage failed"); if (k === SNAPSHOT_STORAGE_KEY) raw = v; },
      removeItem: (k) => { if (k === SNAPSHOT_STORAGE_KEY) raw = null; },
    };
    window.sessionStorage = { getItem: () => null, setItem() {}, removeItem() {} };
    document.visibilityState = "visible";
    intervalCb = null;
    clock = BASE;
    const container = makeNode(1, "DIV");
    container.ownerDocument = document;
    const root = createRoot(container as unknown as Element);
    await act(async () => { root.render(createElement(AppProvider, null, createElement(Harness))); });
    await flush();
    await flush();
    assert.equal(ctx.state.phase, "ready", "挂载后应就绪");
    assert.equal(ctx.state.snapshot!.revision, 1, "会话启动应已提交一次");
    return {
      raw: () => raw,
      setRaw: (v: string | null) => { raw = v; },
      setFail: (v: boolean) => { fail = v; },
      advance: (ms: number) => { clock += ms; },
      async checkpoint() { await act(async () => { intervalCb?.(); for (let i = 0; i < 50; i++) await Promise.resolve(); }); },
      async hidden() {
        document.visibilityState = "hidden";
        await act(async () => { document.dispatchEvent({ type: "visibilitychange" }); for (let i = 0; i < 50; i++) await Promise.resolve(); });
      },
      async pagehide() { await act(async () => { window.dispatchEvent({ type: "pagehide" }); for (let i = 0; i < 50; i++) await Promise.resolve(); }); },
      async storageEvent() { await act(async () => { window.dispatchEvent({ type: "storage", key: SNAPSHOT_STORAGE_KEY }); for (let i = 0; i < 50; i++) await Promise.resolve(); }); },
      async unmount() { await act(async () => { root.unmount(); }); },
    };
  }

  // 场景 1：保存失败 → checkpoint 时机到达 → 存储恢复 → 重试成功（冻结 now/dayKey 不重算）。
  {
    const m = await mount();
    const rev0 = revisionOf(m.raw());
    m.setFail(true);
    let ok = true;
    await act(async () => { ok = await ctx.confirmEntry("今天还好", createManualEmotion("calm")); });
    await flush();
    assert.equal(ok, false);
    assert.ok(ctx.state.pending, "保存失败应保留 pending");
    assert.ok(ctx.state.saveError);
    assert.equal(revisionOf(m.raw()), rev0, "失败不推进 revision");
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(revisionOf(m.raw()), rev0, "pending 期间 checkpoint 不得推进 revision");
    assert.equal(ctx.state.snapshot!.revision, rev0);
    assert.equal(ctx.state.tabConflict, false, "不得误判跨标签页冲突");
    m.setFail(false);
    await act(async () => { ok = await ctx.retrySave(); });
    await flush();
    assert.equal(ok, true, "存储恢复后重试应成功");
    assert.equal(ctx.state.pending, null);
    assert.equal(ctx.state.tabConflict, false);
    const snap = JSON.parse(m.raw()!);
    assert.equal(snap.revision, rev0 + 1);
    assert.equal(snap.entries.length, 1);
    assert.equal(snap.entries[0].text, "今天还好");
    assert.equal(snap.entries[0].createdAt, BASE, "重试不得重算冻结的 now");
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(revisionOf(m.raw()), rev0 + 2, "pending 解决后 checkpoint 恢复");
    await m.unmount();
  }

  // 场景 2：保存失败 → 页面隐藏 / pagehide → 重试成功。
  {
    const m = await mount();
    const rev0 = revisionOf(m.raw());
    m.setFail(true);
    await act(async () => { await ctx.confirmEntry("隐藏时保存失败", createManualEmotion("sadness")); });
    await flush();
    assert.ok(ctx.state.pending);
    m.advance(6 * MIN);
    await m.hidden();
    assert.equal(revisionOf(m.raw()), rev0, "隐藏 checkpoint 不得推进 revision");
    await m.pagehide();
    assert.equal(revisionOf(m.raw()), rev0, "pagehide checkpoint 不得推进 revision");
    assert.equal(ctx.state.tabConflict, false);
    document.visibilityState = "visible";
    m.setFail(false);
    let ok = false;
    await act(async () => { ok = await ctx.retrySave(); });
    await flush();
    assert.equal(ok, true);
    assert.equal(revisionOf(m.raw()), rev0 + 1);
    assert.equal(ctx.state.pending, null);
    await m.unmount();
  }

  // 场景 3：pending 被明确取消后，checkpoint 恢复正常；取消的日记不落盘。
  {
    const m = await mount();
    const rev0 = revisionOf(m.raw());
    m.setFail(true);
    await act(async () => { await ctx.confirmEntry("取消前", createManualEmotion("neutral")); });
    await flush();
    assert.ok(ctx.state.pending);
    m.setFail(false);
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(revisionOf(m.raw()), rev0, "存储可用但 pending 未解决时 checkpoint 仍暂停");
    await act(async () => { ctx.invalidatePending(); });
    await flush();
    assert.equal(ctx.state.pending, null);
    assert.equal(ctx.state.saveError, null);
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(revisionOf(m.raw()), rev0 + 1, "取消后 checkpoint 恢复正常");
    assert.equal(JSON.parse(m.raw()!).entries.length, 0, "取消的日记不应落盘");
    await m.unmount();
  }

  // 场景 4：checkpoint 与日记正常保存不发生重复结算。
  {
    const m = await mount();
    const rev0 = revisionOf(m.raw());
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(revisionOf(m.raw()), rev0 + 1);
    let ok = false;
    await act(async () => { ok = await ctx.confirmEntry("正常保存", createManualEmotion("joy")); });
    await flush();
    assert.equal(ok, true);
    const afterSave = JSON.parse(m.raw()!);
    assert.equal(afterSave.revision, rev0 + 2);
    assert.equal(afterSave.entries.length, 1);
    assert.equal(afterSave.memories.length, 1);
    const evtId = afterSave.appliedEventIds[afterSave.appliedEventIds.length - 1];
    const scoresAfterSave = derivePersonality(afterSave.personality).scores;
    m.advance(6 * MIN);
    await m.checkpoint();
    const afterCp = JSON.parse(m.raw()!);
    assert.equal(afterCp.revision, rev0 + 3);
    assert.deepEqual(afterCp.personality, afterSave.personality, "checkpoint 不改性格");
    assert.deepEqual(derivePersonality(afterCp.personality).scores, scoresAfterSave);
    assert.equal(afterCp.entries.length, 1);
    assert.equal(afterCp.memories.length, 1);
    assert.deepEqual(afterCp.appliedEventIds, afterSave.appliedEventIds, "checkpoint 不写 appliedEventIds");
    const replay = applyGameEvent(afterCp, { type: "CONFIRM_ENTRY", eventId: evtId, entryId: afterSave.entries[0].id, text: "正常保存", emotion: createManualEmotion("joy"), analysis: null, analysisMeta: null }, { now: clock, dayKey: "2026-11-13" });
    assert.equal(replay.changed, false, "同 eventId 重放不重复结算");
    await m.unmount();
  }

  // 场景 5a：跨标签页 storage 事件 → 冲突保护；checkpoint 不覆盖其他标签页新 revision。
  {
    const m = await mount();
    const rev0 = revisionOf(m.raw());
    const other = JSON.parse(m.raw()!);
    other.revision = rev0 + 5;
    m.setRaw(serializeSnapshot(other));
    await m.storageEvent();
    assert.equal(ctx.state.tabConflict, true, "storage 事件应触发跨标签页冲突");
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(revisionOf(m.raw()), rev0 + 5, "冲突时 checkpoint 不得覆盖");
    let ok = true;
    await act(async () => { ok = await ctx.confirmEntry("冲突时不应保存", createManualEmotion("calm")); });
    await flush();
    assert.equal(ok, false, "tabConflict 时 confirmEntry 应被拦截");
    assert.equal(ctx.state.pending, null);
    assert.equal(revisionOf(m.raw()), rev0 + 5);
    assert.equal(JSON.parse(m.raw()!).entries.length, 0);
    await m.unmount();
  }

  // 场景 5b：真实 revision 冲突（无 storage 事件）仍受保护；checkpoint 暂停不绕过 revision 检查。
  {
    const m = await mount();
    const rev0 = revisionOf(m.raw());
    const other = JSON.parse(m.raw()!);
    other.revision = rev0 + 3;
    m.setRaw(serializeSnapshot(other));
    let ok = true;
    await act(async () => { ok = await ctx.confirmEntry("真实冲突", createManualEmotion("calm")); });
    await flush();
    assert.equal(ok, false);
    assert.equal(ctx.state.tabConflict, true, "真实 revision 冲突应暂停提交");
    assert.ok(ctx.state.pending, "冲突保留 pending 供重新加载");
    assert.equal(revisionOf(m.raw()), rev0 + 3, "冲突不得覆盖其他标签页");
    m.advance(6 * MIN);
    await m.checkpoint();
    assert.equal(revisionOf(m.raw()), rev0 + 3, "pending+冲突期间 checkpoint 不覆盖");
    await act(async () => { ok = await ctx.retrySave(); });
    await flush();
    assert.equal(ok, false, "tabConflict 时 retrySave 应被拦截");
    await m.unmount();
  }

  Date.now = realDateNow;
  console.log("阶段四 P1 回归通过：pending 期间 checkpoint 暂停、解决/取消后恢复、跨标签页冲突保护不被绕过");
}
void main().catch((e) => { console.error(e); process.exit(1); });