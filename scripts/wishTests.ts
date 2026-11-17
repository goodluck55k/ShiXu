import assert from "node:assert/strict";
import {
  addWish,
  completeWishInCollection,
  createEmptyWishCollection,
  createPendingWish,
  serializeWishCollection,
  validateWishCollection,
  type WishCollection,
} from "../src/domain/wishes";
import { createLocalStorageWishAdapter, WISH_STORAGE_KEY } from "../src/lib/storage/wishStorage";
import {
  BALL_SLOTS,
  STAR_SLOTS,
  assignBallSlots,
  assignStarSlots,
  hashWishId,
} from "../src/components/wishes/wishLayout";
import type { WishView } from "../src/components/wishes/wishView";

let passed = 0;
type TestCase = { name: string; run: () => void | Promise<void> };
const tests: TestCase[] = [];

function test(name: string, run: () => void | Promise<void>): void {
  tests.push({ name, run });
}

class TestStorage implements Storage {
  private data = new Map<string, string>();
  throwOnGet: Error | null = null;
  throwOnSet: Error | null = null;

  get length(): number {
    return this.data.size;
  }

  clear(): void {
    this.data.clear();
  }

  getItem(key: string): string | null {
    if (this.throwOnGet) throw this.throwOnGet;
    return this.data.has(key) ? this.data.get(key)! : null;
  }

  key(index: number): string | null {
    return [...this.data.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }

  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw this.throwOnSet;
    this.data.set(key, String(value));
  }
}

function wishView(id: string, createdAt: number, status: "pending" | "completed" = "pending", completedAt: number | null = null): WishView {
  return { id, text: `愿望 ${id}`, status, createdAt, completedAt };
}

function buildCollection(texts: string[]): WishCollection {
  let collection = createEmptyWishCollection();
  texts.forEach((text, index) => {
    const created = createPendingWish(`wish-${index + 1}`, text, 1000 + index);
    assert.equal(created.ok, true);
    if (!created.ok) return;
    const added = addWish(collection, created.wish);
    assert.equal(added.ok, true);
    if (added.ok) collection = added.collection;
  });
  return collection;
}

test("创建愿望：pending、completedAt=null，原文逐字保留", () => {
  const result = createPendingWish("wish-1", "  去看海 & <script>alert(1)</script>  ", 1234);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.wish.id, "wish-1");
  assert.equal(result.wish.text, "  去看海 & <script>alert(1)</script>  ");
  assert.equal(result.wish.status, "pending");
  assert.equal(result.wish.createdAt, 1234);
  assert.equal(result.wish.completedAt, null);
});

test("创建愿望：空白文本与非法时间被拒绝", () => {
  assert.equal(createPendingWish("wish-1", "   ", 1).ok, false);
  assert.equal(createPendingWish("", "愿望", 1).ok, false);
  assert.equal(createPendingWish("wish-1", "愿望", Number.NaN).ok, false);
});

test("完成愿望：只由手动操作改变，原子记录 completedAt 且不改原文", () => {
  const collection = buildCollection(["去看海"]);
  const done = completeWishInCollection(collection, "wish-1", 5000);
  assert.equal(done.changed, true);
  assert.equal(done.wish?.status, "completed");
  assert.equal(done.wish?.completedAt, 5000);
  assert.equal(done.wish?.text, "去看海");
  assert.equal(done.wish?.createdAt, 1000);
});

test("重复完成保持幂等，不覆盖第一次完成时间", () => {
  const collection = buildCollection(["去看海"]);
  const first = completeWishInCollection(collection, "wish-1", 5000);
  const second = completeWishInCollection(first.collection, "wish-1", 9000);
  assert.equal(second.changed, false);
  assert.equal(second.collection.wishes[0].completedAt, 5000);
});

test("未知愿望完成是无副作用 no-op", () => {
  const collection = buildCollection(["去看海"]);
  const result = completeWishInCollection(collection, "missing", 5000);
  assert.equal(result.changed, false);
  assert.equal(result.collection, collection);
});

test("集合校验：合法集合通过，pending/completed 时间语义错误被判损坏", () => {
  const collection = buildCollection(["一", "二"]);
  assert.deepEqual(validateWishCollection(JSON.parse(serializeWishCollection(collection))).ok, true);

  const pendingWithTime = JSON.parse(serializeWishCollection(collection));
  pendingWithTime.wishes[0].completedAt = 100;
  assert.equal(validateWishCollection(pendingWithTime).ok, false);

  const completedWithoutTime = JSON.parse(serializeWishCollection(collection));
  completedWithoutTime.wishes[0].status = "completed";
  assert.equal(validateWishCollection(completedWithoutTime).ok, false);
});

test("集合校验：重复 ID 与非法 revision 被判损坏", () => {
  const collection = buildCollection(["一", "二"]);
  const duplicate = JSON.parse(serializeWishCollection(collection));
  duplicate.wishes[1].id = duplicate.wishes[0].id;
  assert.equal(validateWishCollection(duplicate).ok, false);

  const negativeRevision = JSON.parse(serializeWishCollection(collection));
  negativeRevision.revision = -1;
  assert.equal(validateWishCollection(negativeRevision).ok, false);
});

test("集合校验：未来版本被识别为 unsupported-version", () => {
  const result = validateWishCollection({ schemaVersion: 2, revision: 0, wishes: [] });
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.kind, "unsupported-version");
});

test("存储：空存储读取为 missing，首次保存从 revision 0 递增到 1", async () => {
  const storage = new TestStorage();
  const adapter = createLocalStorageWishAdapter(storage);
  assert.deepEqual(adapter.load(), { status: "missing" });
  const collection = buildCollection(["去看海"]);
  const saved = await adapter.save(collection, 0);
  assert.equal(saved.status, "saved");
  if (saved.status !== "saved") return;
  assert.equal(saved.collection.revision, 1);
  assert.equal(saved.collection.wishes.length, 1);
  assert.equal(storage.getItem(WISH_STORAGE_KEY)?.includes("去看海"), true);
  const loaded = adapter.load();
  assert.equal(loaded.status, "ready");
});

test("存储：过期修订号被拒绝，现有数据不被覆盖", async () => {
  const storage = new TestStorage();
  const adapter = createLocalStorageWishAdapter(storage);
  const collection = buildCollection(["一"]);
  const saved = await adapter.save(collection, 0);
  assert.equal(saved.status, "saved");
  const rawBefore = storage.getItem(WISH_STORAGE_KEY);
  const stale = await adapter.save(collection, 0);
  assert.equal(stale.status, "conflict");
  assert.equal(storage.getItem(WISH_STORAGE_KEY), rawBefore);
});

test("存储：两个适配器并发提交时，后提交者的过期修订被拦截", async () => {
  const storage = new TestStorage();
  const tabA = createLocalStorageWishAdapter(storage);
  const tabB = createLocalStorageWishAdapter(storage);
  const base = buildCollection(["一"]);
  const first = await tabA.save(base, 0);
  assert.equal(first.status, "saved");
  assert.equal(tabB.load().status, "ready");
  const second = await tabB.save(base, 0);
  assert.equal(second.status, "conflict");
  const loaded = tabB.load();
  assert.equal(loaded.status, "ready");
  if (loaded.status === "ready") assert.equal(loaded.collection.revision, 1);
});

test("存储：损坏 JSON 与未来版本都保留原始内容，保存不会覆盖", async () => {
  const storage = new TestStorage();
  const adapter = createLocalStorageWishAdapter(storage);
  storage.setItem(WISH_STORAGE_KEY, "{not json");
  const corruptLoad = adapter.load();
  assert.equal(corruptLoad.status, "corrupt");
  const corruptSave = await adapter.save(buildCollection(["一"]), 0);
  assert.equal(corruptSave.status, "corrupt");
  assert.equal(storage.getItem(WISH_STORAGE_KEY), "{not json");

  storage.setItem(WISH_STORAGE_KEY, JSON.stringify({ schemaVersion: 9, revision: 3, wishes: [] }));
  const futureLoad = adapter.load();
  assert.equal(futureLoad.status, "unsupported-version");
  const futureSave = await adapter.save(buildCollection(["一"]), 0);
  assert.equal(futureSave.status, "unsupported-version");
  assert.equal(storage.getItem(WISH_STORAGE_KEY), JSON.stringify({ schemaVersion: 9, revision: 3, wishes: [] }));
});

test("存储：额度不足与存储不可用返回明确状态", async () => {
  const quotaStorage = new TestStorage();
  quotaStorage.throwOnSet = new DOMException("quota", "QuotaExceededError");
  const quotaAdapter = createLocalStorageWishAdapter(quotaStorage);
  const quota = await quotaAdapter.save(buildCollection(["一"]), 0);
  assert.equal(quota.status, "quota-exceeded");
  assert.equal(quotaStorage.getItem(WISH_STORAGE_KEY), null);

  const deniedStorage = new TestStorage();
  deniedStorage.throwOnGet = new Error("denied");
  const deniedAdapter = createLocalStorageWishAdapter(deniedStorage);
  assert.equal(deniedAdapter.load().status, "unavailable");
  assert.equal((await deniedAdapter.save(buildCollection(["一"]), 0)).status, "unavailable");
});

test("存储：重置只覆盖用户确认过的同一份原始数据", async () => {
  const storage = new TestStorage();
  const adapter = createLocalStorageWishAdapter(storage);
  storage.setItem(WISH_STORAGE_KEY, "{broken");
  const conflict = await adapter.reset("different-raw");
  assert.equal(conflict.status, "conflict");
  assert.equal(storage.getItem(WISH_STORAGE_KEY), "{broken");

  const reset = await adapter.reset("{broken");
  assert.equal(reset.status, "saved");
  if (reset.status === "saved") assert.equal(reset.collection.revision, 0);
  assert.deepEqual(adapter.load(), { status: "ready", collection: createEmptyWishCollection() });
});

test("槽位：纸团最多 8 个，槽位唯一，且同一输入顺序无关", () => {
  const wishes = Array.from({ length: 10 }, (_, index) => wishView(`wish-${index}`, 1000 + index));
  const first = assignBallSlots(wishes);
  const shuffled = assignBallSlots([...wishes].reverse());
  assert.equal(first.length, 8);
  assert.equal(new Set(first.map((item) => item.slotIndex)).size, first.length);
  assert.deepEqual(
    first.map((item) => `${item.wish.id}:${item.slotIndex}`).sort(),
    shuffled.map((item) => `${item.wish.id}:${item.slotIndex}`).sort(),
  );
  assert.equal(first[0].wish.id, "wish-0");
  assert.equal(first[7].wish.id, "wish-7");
  assert.equal(BALL_SLOTS.length, 8);
});

test("槽位：星星最多 5 颗，按完成时间取最早完成者", () => {
  const wishes = Array.from({ length: 7 }, (_, index) =>
    wishView(`wish-${index}`, 1000 + index, "completed", 5000 + index),
  );
  const stars = assignStarSlots(wishes);
  assert.equal(stars.length, 5);
  assert.equal(new Set(stars.map((item) => item.slotIndex)).size, 5);
  assert.equal(stars[0].wish.id, "wish-0");
  assert.equal(stars[4].wish.id, "wish-4");
  assert.equal(STAR_SLOTS.length, 5);
});

test("槽位：颜色、尺寸与倾角由愿望 ID 稳定派生，刷新不随机", () => {
  const wishes = Array.from({ length: 6 }, (_, index) => wishView(`stable-${index}`, 1000 + index));
  const first = assignBallSlots(wishes);
  const second = assignBallSlots(wishes);
  assert.deepEqual(first.map((item) => item.wish.id), second.map((item) => item.wish.id));
  first.forEach((item, index) => {
    assert.equal(item.palette, second[index].palette);
    assert.equal(item.scale, second[index].scale);
    assert.equal(item.rotation, second[index].rotation);
    assert.equal(hashWishId(item.wish.id), second[index].hash);
  });
});

void (async () => {
  for (const item of tests) {
    try {
      await item.run();
      passed += 1;
      console.log(`✓ ${item.name}`);
    } catch (error) {
      console.error(`✗ ${item.name}`);
      throw error;
    }
  }
  console.log(`\n愿望专项测试通过：${passed} 项`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});