"use client";

import Link from "next/link";
import { useEffect, useState, type CSSProperties } from "react";
import { CharacterRenderer } from "@/components/character/CharacterRenderer";
import type { PenguinDirection } from "@/components/character/PenguinPoses";
import { SPECIAL_MOTION_MS } from "@/components/character/specialMotion";
import { BEHAVIOR_V2 } from "@/config/behavior";
import type { BehaviorDefinition, BehaviorId } from "@/domain/behavior";
import type { CharacterView } from "@/domain/types";
import styles from "./penguin-demo.module.css";

const behaviorById = new Map<BehaviorId, BehaviorDefinition>(BEHAVIOR_V2.behaviors.map(behavior => [behavior.id, behavior]));

type DemoGroup = { key: string; title: string; accent: string; items: BehaviorDefinition[] };

function dominantGroup(id: string, title: string, accent: string): DemoGroup {
  return {
    key: id,
    title,
    accent,
    items: BEHAVIOR_V2.behaviors.filter(behavior => behavior.category === "dominant" && behavior.dominantId === id),
  };
}

const GROUPS: DemoGroup[] = [
  { key: "ambient", title: "待机", accent: "#d9c8b0", items: BEHAVIOR_V2.behaviors.filter(behavior => behavior.category === "ambient") },
  dominantGroup("gentleness", "温柔", "#e9c9b3"),
  dominantGroup("curiosity", "好奇", "#b9d3c4"),
  dominantGroup("cheerfulness", "开朗", "#f0d795"),
  dominantGroup("fearfulness", "害怕", "#cfd3e6"),
  dominantGroup("low_mood", "低落", "#c9c3d6"),
  { key: "interaction", title: "互动", accent: "#b9dcc9", items: BEHAVIOR_V2.behaviors.filter(behavior => behavior.category === "interaction") },
  { key: "special", title: "特殊行为", accent: "#e2c3a9", items: BEHAVIOR_V2.behaviors.filter(behavior => behavior.category === "special") },
];

const EXPRESSIONS = [
  ["neutral", "自然"], ["happy", "开心"], ["soft", "温柔"],
  ["sad", "失落"], ["wary", "担心"], ["angry", "不满"],
  ["tired", "困倦"], ["mixed", "纠结"], ["blank", "放空"],
] as const;
const EXPRESSION_LABELS = new Map<string, string>(EXPRESSIONS.map(([id, label]): [string, string] => [id, label]));

const DIRECTIONS: [PenguinDirection, string][] = [["front", "正面"], ["left", "左侧"], ["right", "右侧"], ["back", "背面"]];
const FIXED_FRONT_POSES = new Set(["sit", "kneel", "curl", "corner", "window"]);

function expressionLabel(id: string) {
  return EXPRESSION_LABELS.get(id) ?? id;
}

function playDirection(def: BehaviorDefinition, direction: PenguinDirection): PenguinDirection | undefined {
  if (def.id === "spin") return undefined;
  if (def.animation === "walk" && direction === "front") return undefined;
  if (FIXED_FRONT_POSES.has(def.pose)) return "front";
  return direction;
}

export function PenguinDemo() {
  const [activeId, setActiveId] = useState<BehaviorId | null>(null);
  const [lastId, setLastId] = useState<BehaviorId | null>(null);
  const [run, setRun] = useState(0);
  const [expression, setExpression] = useState("neutral");
  const [direction, setDirection] = useState<PenguinDirection>("front");

  const activeDefinition = activeId ? behaviorById.get(activeId) ?? null : null;
  const activeDuration = !activeDefinition ? 0 : activeDefinition.category === "special" ? SPECIAL_MOTION_MS : activeDefinition.durationMs;

  useEffect(() => {
    if (!activeId) return;
    const definition = behaviorById.get(activeId);
    if (!definition) return;
    const duration = definition.category === "special" ? SPECIAL_MOTION_MS : definition.durationMs;
    const timer = window.setTimeout(() => setActiveId(null), duration);
    const onVisibility = () => { if (document.hidden) setActiveId(null); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [activeId, run]);

  function play(id: BehaviorId) {
    const definition = behaviorById.get(id);
    if (!definition) return;
    setLastId(id);
    setActiveId(id);
    setRun(value => value + 1);
    if (definition.category === "special" || definition.id === "spin" || FIXED_FRONT_POSES.has(definition.pose)) setDirection("front");
  }

  function stop() {
    setActiveId(null);
  }

  function previewExpression(id: string) {
    setExpression(id);
    setDirection("front");
    setActiveId(null);
  }

  const idleView: CharacterView = { pose: "stand", expression, animation: "breathe", visibleLayerIds: [], effects: [] };
  const view: CharacterView = activeDefinition
    ? { ...idleView, behaviorId: activeDefinition.id, pose: activeDefinition.pose, expression: activeDefinition.expression, animation: activeDefinition.animation }
    : idleView;
  const viewDirection = activeDefinition ? playDirection(activeDefinition, direction) : direction;
  const statusText = activeDefinition ? `正在播放 · ${activeDefinition.label}` : "待机 · 安静呼吸";
  const statusMeta = activeDefinition
    ? activeDefinition.category === "special"
      ? "特殊动作 · 直接演示，不校验正式触发条件"
      : `表情：${expressionLabel(activeDefinition.expression)} · 约 ${Math.round(activeDuration / 1000)} 秒`
    : `待机表情：${expressionLabel(expression)}`;

  return <main className={styles.page}>
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <Link href="/" className={styles.back}>← 回到小屋</Link>
        <span className={styles.modeBadge}>演示模式 · 不读写正式存档</span>
      </div>

      <header className={styles.intro}>
        <p className={styles.kicker}>拾绪 SHIXU · 动作演示馆</p>
        <h1 className={styles.title}>企鹅动作演示馆</h1>
        <p className={styles.sub}>点选动作立即播放，也可以单独试看九种表情与正面、侧面、背面姿态。全部使用正式产品中的企鹅与动画表现。</p>
      </header>

      <div className={styles.layout}>
        <section className={styles.stageCard} aria-label="企鹅动作演示舞台">
          <span className={styles.tape} aria-hidden="true" />
          <div className={styles.scene}>
            <div className={styles.character} key={`${run}-${activeId ?? "idle"}`}>
              <CharacterRenderer view={view} direction={viewDirection} />
            </div>
          </div>
          <div className={styles.statusRow}>
            <span className={`${styles.dot}${activeDefinition ? ` ${styles.dotLive}` : ""}`} aria-hidden="true" />
            <p className={styles.statusText} aria-live="polite">{statusText}</p>
            <span className={styles.statusMeta}>{statusMeta}</span>
          </div>
          {activeDefinition && <div className={styles.progress} aria-hidden="true">
            <span key={run} style={{ "--duration": `${activeDuration}ms` } as CSSProperties} />
          </div>}
          <div className={styles.transport}>
            <button type="button" className={styles.primary} onClick={() => lastId && play(lastId)} disabled={!lastId}>⟳ 重新播放</button>
            <button type="button" className={styles.ghost} onClick={stop} disabled={!activeDefinition}>■ 停止 · 回到待机</button>
          </div>
        </section>

        <div className={styles.panel}>
          <section className={styles.card}>
            <h2 className={styles.cardTitle}><small>ACTIONS</small>动作</h2>
            <div className={styles.groups}>
              {GROUPS.map(group => <div key={group.key}>
                <div className={styles.groupHead}>
                  <span className={styles.groupDot} style={{ background: group.accent }} aria-hidden="true" />
                  <span className={styles.groupName}>{group.title}</span>
                  <span className={styles.groupCount}>{group.items.length}</span>
                </div>
                <div className={styles.groupActions}>
                  {group.items.map(definition => <button
                    key={definition.id}
                    type="button"
                    className={styles.actionBtn}
                    aria-pressed={activeId === definition.id}
                    onClick={() => play(definition.id)}
                  >{definition.label}</button>)}
                </div>
              </div>)}
            </div>
            <p className={styles.note}>特殊行为在正式产品里需要「低落主导 + 连续四天难过日记」，本页可直接播放，方便演示。</p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}><small>FACE</small>表情</h2>
            <div className={styles.chips}>
              {EXPRESSIONS.map(([id, label]) => <button
                key={id}
                type="button"
                className={styles.chip}
                aria-pressed={expression === id}
                onClick={() => previewExpression(id)}
              >{label}</button>)}
            </div>
            <p className={styles.note}>表情在待机与正面姿态下预览；播放动作时使用该动作在正式配置里的表情。</p>
          </section>

          <section className={styles.card}>
            <h2 className={styles.cardTitle}><small>POSE</small>姿态</h2>
            <div className={styles.chips}>
              {DIRECTIONS.map(([id, label]) => <button
                key={id}
                type="button"
                className={styles.chip}
                aria-pressed={direction === id}
                onClick={() => setDirection(id)}
              >{label}</button>)}
            </div>
            <p className={styles.note}>走路动作默认朝右；坐下、抱膝、靠窗等坐姿固定使用正面。</p>
          </section>
        </div>
      </div>

      <p className={styles.footnote}>演示状态只保存在当前页面内存中，不读取或写入正式存档，不修改情绪、性格与行为规则，也不调用 AI。</p>
    </div>
  </main>;
}