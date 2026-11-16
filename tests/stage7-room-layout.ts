import assert from "node:assert/strict";
import { ROOM_ZONES, roomDestination, roomRoute } from "../src/components/character/roomLayout";
const zones = ["center", "window", "plants", "nest", "path"] as const;
for (const from of zones) for (const to of zones) {
  const route = roomRoute(ROOM_ZONES[from], to);
  if (from === to) { assert.equal(route.length, 0); continue; }
  assert.deepEqual(route[0], ROOM_ZONES[from]);
  assert.deepEqual(route.at(-1), ROOM_ZONES[to]);
  for (const point of route) { assert.ok(point.x >= 22 && point.x <= 68); assert.ok(point.y >= 83 && point.y <= 92); }
  assert.equal(route[1].y, ROOM_ZONES.path.y); assert.equal(route[2].y, ROOM_ZONES.path.y);
}
assert.equal(roomDestination("window_gaze", ROOM_ZONES.center), "window");
assert.equal(roomDestination("observe_object", ROOM_ZONES.center), "plants");
assert.equal(roomDestination("quiet_sit", ROOM_ZONES.center), "nest");
assert.equal(roomDestination("gentle_gaze", ROOM_ZONES.window), "center");
assert.equal(roomDestination("smoke", ROOM_ZONES.center), null);
assert.equal(roomDestination("respond_call", ROOM_ZONES.center), null);
console.log("小屋五区域、走廊边界与行为映射检查通过");
