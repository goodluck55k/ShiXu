"use client";

import "./memories.css";
import { useApp } from "@/application/AppProvider";
import { MemoryScrapbook } from "@/components/memories/MemoryScrapbook";

export default function Page() {
  const { state } = useApp();
  return <MemoryScrapbook entries={state.snapshot?.entries ?? []} />;
}
