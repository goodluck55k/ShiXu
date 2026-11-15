import assert from "node:assert/strict";

// 存档可靠性回归：日记保存提示绑定本次成功提交；成功重置清除冲突；
// 保存前发现损坏/版本不支持时进入恢复状态而不是误报跨标签页冲突。

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
  window.setInterval = () => 1;
  window.clearInterval = () => {};
  const g = globalThis as unknown as Record<string, unknown>;
  g.window = window;
  g.document = document;
  g.IS_REACT_ACT_ENVIRONMENT = true;

  const realDateNow = Date.now;
  Date.now = () => BASE;

  const { createRoot } = await import("react-dom/client");
  const { act, createElement } = await import("react");
  const { AppProvider, useApp } = await import("../src/application/AppProvider");
  const { createManualEmotion } = await import("../src/domain/emotions");
  const { SNAPSHOT_STORAGE_KEY } = await import("../src/lib/storage/localStorageAdapter");

  let ctx = null as unknown as ReturnType<typeof useApp>;
  function Harness() { ctx = useApp(); return null; }

  async function flush() {
    await act(async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); });
  }

  async function mount() {
    let raw: string | null = null;
    let fail = false;
    window.localStorage = {
      getItem: (k) => (k === SNAPSHOT_STORAGE_KEY ? raw : null),
      setItem: (k, v) => { if (fail) throw new Error("storage failed"); if (k === SNAPSHOT_STORAGE_KEY) raw = v; },
      removeItem: (k) => { if (k === SNAPSHOT_STORAGE_KEY) raw = null; },
    };
    document.visibilityState = "visible";
    const container = makeNode(1, "DIV");
    container.ownerDocument = document;
    const root = createRoot(container as unknown as Element);
    await act(async () => { root.render(createElement(AppProvider, null, createElement(Harness))); });
    await flush();
    await flush();
    assert.equal(ctx.state.phase, "ready", "挂载后应就绪");
    return {
      raw: () => raw,
      setRaw: (v: string | null) => { raw = v; },
      setFail: (v: boolean) => { fail = v; },
      async confirm(text: string, label: Parameters<typeof createManualEmotion>[0] = "calm") {
        let ok = false;
        await act(async () => { ok = await ctx.confirmEntry(text, createManualEmotion(label)); });
        await flush();
        return ok;
      },
      async retry() {
        let ok = false;
        await act(async () => { ok = await ctx.retrySave(); });
        await flush();
        return ok;
      },
      async editDraft(text: string) {
        await act(async () => {
          ctx.setDraft((current) => ({ ...current, text }));
          ctx.invalidatePending();
        });
        await flush();
      },
      async storageEvent() {
        await act(async () => {
          window.dispatchEvent({ type: "storage", key: SNAPSHOT_STORAGE_KEY });
          for (let i = 0; i < 20; i++) await Promise.resolve();
        });
      },
      async reset() {
        await act(async () => { await ctx.resetStorage(); });
        await flush();
      },
      async reload() {
        await act(async () => { await ctx.reload(); });
        await flush();
        await flush();
      },
      async unmount() { await act(async () => { root.unmount(); }); },
    };
  }

  const parsed = (raw: string | null) => JSON.parse(raw!) as { revision: number; entries: { id: string; revision: number }[] };

  // 场景 1：成功提示只关联本次已提交日记；草稿变化、失败、重载、临时切换、重置后都不残留。
  {
    const m = await mount();
    assert.equal(ctx.state.savedNotice, null, "初始不显示保存提示");

    assert.equal(await m.confirm("第一条"), true);
    assert.equal(ctx.state.savedNotice, "persisted");
    assert.equal(parsed(m.raw()).entries.length, 1);

    await m.editDraft("准备写下一条");
    assert.equal(ctx.state.savedNotice, null, "新草稿开始后不得声称当前内容已保存");

    m.setFail(true);
    assert.equal(await m.confirm("保存失败的一条"), false);
    assert.ok(ctx.state.saveError);
    assert.ok(ctx.state.pending, "失败应保留待重试操作");
    assert.equal(ctx.state.savedNotice, null, "保存失败不得显示成功提示");
    assert.equal(parsed(m.raw()).entries.length, 1, "失败不得写入新日记");

    m.setFail(false);
    assert.equal(await m.retry(), true);
    assert.equal(ctx.state.savedNotice, "persisted", "重试成功应显示本次保存提示");
    assert.equal(parsed(m.raw()).entries.length, 2, "失败重试只结算一次");

    const entry = ctx.state.snapshot!.entries[0];
    await m.editDraft("");
    assert.equal(ctx.state.savedNotice, null);
    let edited = false;
    await act(async () => { edited = await ctx.editEntryText(entry.id, entry.revision, "编辑正文"); });
    await flush();
    assert.equal(edited, true);
    assert.equal(ctx.state.savedNotice, null, "非日记操作成功不得触发日记保存提示");

    assert.equal(await m.confirm("重载前"), true);
    assert.equal(ctx.state.savedNotice, "persisted");
    await m.reload();
    assert.equal(ctx.state.savedNotice, null, "重新加载不得保留过期提示");

    await act(async () => { ctx.enableTemporary(); });
    await flush();
    assert.equal(ctx.state.savedNotice, null, "切换临时体验不得保留正式保存提示");
    assert.equal(await m.confirm("临时的一条"), true);
    assert.equal(ctx.state.savedNotice, "temporary", "临时体验提示必须区别于正式持久化");
    assert.equal(parsed(m.raw()).entries.length, 3, "临时体验不写正式存档");
    await act(async () => { ctx.enableTemporary(); });
    await flush();
    assert.equal(ctx.state.savedNotice, null, "再次切换临时体验不得保留旧提示");
    await m.unmount();
  }

  // 场景 2：真实冲突状态下成功重置 → 冲突解除、恢复 ready、可立即保存；重置失败不得假装冲突已解决。
  {
    const m = await mount();
    await m.storageEvent();
    assert.equal(ctx.state.tabConflict, true);
    assert.equal(await m.confirm("冲突中被阻止"), false, "冲突时必须阻止保存");

    m.setFail(true);
    await m.reset();
    assert.equal(ctx.state.tabConflict, true, "重置失败不得清除冲突");
    assert.ok(ctx.state.saveError, "重置失败应报告原因");
    assert.equal(ctx.state.phase, "ready");

    m.setFail(false);
    await m.reset();
    assert.equal(ctx.state.tabConflict, false, "成功重置必须清除冲突");
    assert.equal(ctx.state.phase, "ready");
    assert.equal(ctx.state.saveError, null);
    assert.equal(ctx.state.snapshot!.revision, 0, "重置后回到初始快照");
    assert.equal(parsed(m.raw()).entries.length, 0);

    assert.equal(await m.confirm("重置后立即保存"), true, "成功重置后无需刷新即可保存");
    assert.equal(ctx.state.savedNotice, "persisted");
    assert.equal(parsed(m.raw()).entries.length, 1);
    await m.unmount();
  }

  // 场景 3：保存前发现损坏存档 → 进入 corrupt 恢复状态，保留原始数据与草稿，不覆盖、不误报冲突。
  {
    const m = await mount();
    await m.editDraft("损坏时仍要保留的正文");
    m.setRaw("broken");
    assert.equal(await m.confirm("损坏时保存"), false);
    assert.equal(ctx.state.phase, "corrupt");
    assert.equal(ctx.state.tabConflict, false, "损坏不得误报为跨标签页冲突");
    assert.equal(ctx.state.problem!.raw, "broken", "原始损坏内容必须保留供导出");
    assert.equal(ctx.state.problem!.reason, "存档不是合法 JSON");
    assert.equal(ctx.state.snapshot, null);
    assert.equal(ctx.state.pending, null, "进入恢复状态不得留下可重试的未提交候选");
    assert.equal(ctx.state.savedNotice, null);
    assert.ok(ctx.state.saveError);
    assert.equal(ctx.draft.text, "损坏时仍要保留的正文", "恢复状态必须保留失败草稿");
    assert.equal(m.raw(), "broken", "不得自动覆盖损坏存档");

    await m.reset();
    assert.equal(ctx.state.phase, "ready");
    assert.equal(ctx.state.tabConflict, false);
    const afterReset = parsed(m.raw());
    assert.equal(afterReset.revision, 0);
    assert.equal(afterReset.entries.length, 0, "未提交候选不得写入重置后的新存档");
    assert.equal(await m.confirm("重置后保存"), true);
    assert.equal(parsed(m.raw()).entries.length, 1);
    await m.unmount();
  }

  // 场景 4：保存前发现版本不支持 → 精确报告 unsupported-version，保留 raw；真实修订冲突仍被阻止。
  {
    const m = await mount();
    m.setRaw('{"schemaVersion":99}');
    assert.equal(await m.confirm("版本不支持时保存"), false);
    assert.equal(ctx.state.phase, "unsupported-version");
    assert.equal(ctx.state.tabConflict, false);
    assert.equal(ctx.state.problem!.raw, '{"schemaVersion":99}');
    await m.reset();
    assert.equal(ctx.state.phase, "ready");

    const external = { ...parsed(m.raw()), revision: 50, entries: [] };
    m.setRaw(JSON.stringify(external));
    assert.equal(await m.confirm("真实冲突"), false);
    assert.equal(ctx.state.tabConflict, true, "真实 revision 冲突仍被阻止");
    assert.equal(ctx.state.phase, "ready", "真实冲突不得进入损坏恢复状态");
    assert.equal(m.raw(), JSON.stringify(external), "冲突不得覆盖其他标签页的存档");
    await m.unmount();
  }

  Date.now = realDateNow;
  console.log("存档可靠性回归通过：保存提示、冲突重置与损坏恢复状态");
}
void main().catch((e) => { console.error(e); process.exit(1); });
