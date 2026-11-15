import type { BehaviorId } from "@/domain/behavior";

// Coordinates share the uncropped room illustration's 2170 × 725 coordinate system.
// Feet stay on the open floor, in front of the bench, table, plant pots and nest.
export type RoomPoint = { x: number; y: number };
export type RoomZone = "center" | "window" | "plants" | "nest" | "path";
export const ROOM_ZONES: Record<RoomZone, RoomPoint> = {
  center: { x: 50, y: 88 }, window: { x: 32, y: 83 }, plants: { x: 22, y: 87 },
  nest: { x: 68, y: 84 }, path: { x: 50, y: 92 },
};
const DESTINATIONS: Partial<Record<BehaviorId, RoomZone>> = {
  window_gaze: "window", look_around: "window", observe_object: "plants", approach_novel: "plants",
  corner_hide: "nest", curl_up: "nest", quiet_sit: "nest", knee_rest: "nest", sit_alone: "nest",
  gentle_gaze: "center", greet: "center", bounce: "center", spin: "center",
};
const WALKING = new Set<BehaviorId>(["wander_explore", "hesitant_approach", "slow_walk"]);
export function roomDestination(id: BehaviorId, current: RoomPoint): RoomZone | null {
  return DESTINATIONS[id] ?? (WALKING.has(id) ? (current.x < ROOM_ZONES.center.x ? "nest" : "window") : null);
}
export function roomRoute(current: RoomPoint, destination: RoomZone): RoomPoint[] {
  const target = ROOM_ZONES[destination];
  if (Math.hypot(current.x - target.x, current.y - target.y) < 1) return [];
  // Cross the central floor corridor before approaching either side; no furniture is traversed.
  return [current, { x: current.x, y: ROOM_ZONES.path.y }, { x: target.x, y: ROOM_ZONES.path.y }, target];
}
