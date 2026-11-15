"use client";
import { useState } from "react";
import { RoomScene } from "@/components/character/RoomScene";
import { BEHAVIOR_V2 } from "@/config/behavior";
import type { BehaviorDecision, BehaviorId } from "@/domain/behavior";
import type { CharacterView } from "@/domain/types";
const choices: Array<[BehaviorId, string]> = [["gentle_gaze", "中央"], ["window_gaze", "窗边"], ["observe_object", "植物角"], ["quiet_sit", "小窝"], ["wander_explore", "过渡路径"], ["respond_call", "互动打断"], ["smoke", "特殊动作"], ["respond_pat", "保存反馈"]];
const baseView: CharacterView = { expression: "neutral", pose: "stand", animation: "breathe", visibleLayerIds: ["body", "face"], effects: [] };
export function RoomPreview() {
 const [decision, setDecision] = useState<BehaviorDecision | null>(null);
 const [paused, setPaused] = useState(false);
 const [reunionPending, setReunionPending] = useState(false);
 function choose(id: BehaviorId) {
  const def = BEHAVIOR_V2.behaviors.find(item => item.id === id)!;
  setDecision({ behaviorId:id, category:def.category, dominantId:"gentleness", pose:def.pose, expression:def.expression, animation:def.animation, amplitude:1, durationMs:def.durationMs, reasonCode:id === "respond_pat" ? "save_feedback" : def.category });
 }
 const view = decision ? { ...baseView, behaviorId: decision.behaviorId, pose: decision.pose, expression: decision.expression, animation: decision.animation } : baseView;
 return <section><h1>小屋路径开发预览</h1><p>仅用于查看既有行为的场景表现，不读取或写入正式存档。</p><div style={{display:"flex", gap:8, flexWrap:"wrap"}}>{choices.map(([id,name]) => <button key={id} onClick={() => choose(id)}>{name}</button>)}<button onClick={() => setPaused(value => !value)}>{paused ? "恢复" : "暂停"}</button><button onClick={() => setReunionPending(value => !value)}>{reunionPending ? "关闭重逢门控" : "重逢门控"}</button></div><div style={{maxWidth:1100, margin:"16px 0"}}><RoomScene decision={decision} view={view} paused={paused} feedbackActive={decision?.reasonCode === "save_feedback"} showHearts={false} reunionPending={reunionPending}/></div></section>;
}
