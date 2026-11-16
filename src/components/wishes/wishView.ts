// Presentation-only view contract for the wish house. Round two will map real
// persisted wishes onto this shape; nothing here reads or writes the snapshot.
export type WishStatus = "pending" | "completed";
export type WishDecorIcon = "shoe" | "book" | "trip" | "phone" | "dish" | "sprout";

export interface WishView {
  id: string;
  text: string;
  status: WishStatus;
  icon?: WishDecorIcon;
}

// Candidate visual caps, subject to visual review; the full list stays accessible in the board.
export const MAX_VISIBLE_BALLS = 8;
export const MAX_VISIBLE_STARS = 5;

// Isolated development sample, injected only in development via ?preview=sample.
// It is never persisted and must always be labelled as sample data on screen.
export const DEV_SAMPLE_WISHES: WishView[] = [
  { id: "sample-p1", text: "坚持每周运动 3 次", status: "pending", icon: "shoe" },
  { id: "sample-p2", text: "读完一本一直想读的书", status: "pending", icon: "book" },
  { id: "sample-p3", text: "准备一次小小的旅行", status: "pending", icon: "trip" },
  { id: "sample-p4", text: "给窗台的绿植换一个新花盆", status: "pending", icon: "sprout" },
  { id: "sample-p5", text: "早睡一周，看看清晨的样子", status: "pending", icon: "sprout" },
  { id: "sample-c1", text: "给妈妈打一通长长的电话", status: "completed", icon: "phone" },
  { id: "sample-c2", text: "学会做一道新菜", status: "completed", icon: "dish" },
  { id: "sample-c3", text: "把书桌收拾成喜欢的样子", status: "completed", icon: "sprout" },
];