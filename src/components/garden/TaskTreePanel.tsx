"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";

type Task = {
  id: string;
  conversationId: string | null;
  flowerKey: string;
  title: string;
  description: string;
  isCompleted: boolean;
  completedAt: string | null;
  createdAt: string;
};

const EQ_DOMAINS: Record<string, { label: string; icon: string; color: string }> = {
  daisy:     { label: "Self-Awareness",  icon: "🌼", color: "#f5c842" },
  lavender:  { label: "Self-Regulation", icon: "🌿", color: "#a49bcf" },
  sunflower: { label: "Motivation",      icon: "🌻", color: "#f09a2b" },
  iris:      { label: "Empathy",         icon: "🪻", color: "#7e94c8" },
  rose:      { label: "Social Skills",   icon: "🌸", color: "#e88fad" },
};

function seededRandom(seed: string, salt: number) {
  let h = salt;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

function tagLayout(task: Task, index: number, total: number) {
  const slot = total <= 1 ? 0.5 : index / (total - 1);
  const jitter = seededRandom(task.id, 1) - 0.5;
  const band = index % 2;
  return {
    left: 9 + slot * 76 + jitter * 6,
    top: 8 + band * 21 + seededRandom(task.id, 2) * 12,
  };
}

// Hover-only tooltip — no interactive elements inside
function TaskTag({
  task,
  index,
  total,
  onSelect,
}: {
  task: Task;
  index: number;
  total: number;
  onSelect: (task: Task) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { left, top } = tagLayout(task, index, total);
  const domain = EQ_DOMAINS[task.flowerKey] ?? { label: task.flowerKey, icon: "🌿", color: "#7a9e72" };

  return (
    <button
      type="button"
      className="garden-memory-tag"
      style={{ left: `${left}%`, top: `${top}%` }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onClick={() => onSelect(task)}
      aria-label={`Task: ${task.title}`}
    >
      <span
        className="garden-memory-tag-art"
        style={{ filter: `drop-shadow(0 8px 14px ${domain.color}88)` }}
      >
        <Image src="/garden/tag-memory-tree.png" alt="" fill sizes="84px" style={{ objectFit: "contain" }} />
      </span>

      {/* Hover preview — title only, no buttons */}
      <span className={"garden-memory-card" + (hovered ? " visible" : "")}>
        <span className="garden-memory-card-dot" style={{ background: domain.color }} aria-hidden />
        <span>
          <span className="eyebrow">{domain.label}</span>
          <span className="content">{task.title}</span>
          <span className="date">Tap to view task</span>
        </span>
      </span>
    </button>
  );
}

// Full task detail card — rendered outside the tag button so clicks work cleanly
function TaskDetail({
  task,
  onClose,
  onComplete,
}: {
  task: Task;
  onClose: () => void;
  onComplete: (id: string) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const domain = EQ_DOMAINS[task.flowerKey] ?? { label: task.flowerKey, icon: "🌿", color: "#7a9e72" };

  async function handleDone() {
    setBusy(true);
    await onComplete(task.id);
    setBusy(false);
    onClose();
  }

  return (
    // Backdrop: click outside closes the card
    <div
      onClick={onClose}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 20,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.25)",
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "rgba(252, 248, 240, 0.97)",
          borderRadius: 20,
          padding: "24px 22px 20px",
          maxWidth: 320,
          width: "90%",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          border: `1.5px solid ${domain.color}44`,
          position: "relative",
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 14,
            background: "none",
            border: "none",
            fontSize: 18,
            color: "#b8a98a",
            cursor: "pointer",
            lineHeight: 1,
          }}
        >
          ×
        </button>

        {/* Domain badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 14 }}>
          <span style={{
            fontSize: 22,
            lineHeight: 1,
          }}>{domain.icon}</span>
          <span style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: domain.color,
            background: `${domain.color}18`,
            border: `1px solid ${domain.color}33`,
            borderRadius: 20,
            padding: "3px 9px",
          }}>{domain.label}</span>
        </div>

        {/* Title */}
        <p style={{
          fontWeight: 800,
          fontSize: 16,
          color: "var(--g-ink, #3a3228)",
          lineHeight: 1.35,
          marginBottom: 10,
        }}>
          {task.title}
        </p>

        {/* Description */}
        <p style={{
          fontSize: 13.5,
          color: "var(--g-ink-soft, #7a6e60)",
          lineHeight: 1.6,
          marginBottom: 20,
        }}>
          {task.description}
        </p>

        {/* Mark done */}
        <button
          type="button"
          onClick={handleDone}
          disabled={busy}
          style={{
            width: "100%",
            padding: "11px 0",
            background: busy ? "rgba(122,158,114,0.3)" : "#7a9e72",
            border: "none",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 800,
            color: "#fff",
            cursor: busy ? "not-allowed" : "pointer",
            fontFamily: "inherit",
            letterSpacing: "0.03em",
            transition: "all 0.18s",
            boxShadow: busy ? "none" : "0 4px 14px rgba(122,158,114,0.35)",
          }}
        >
          {busy ? "Saving…" : "✓ Mark as done"}
        </button>
      </div>
    </div>
  );
}

export function TaskTreePanel({
  onClose,
  expectingTask = false,
  taskConversationId,
  onTaskArrived,
}: {
  onClose: () => void;
  expectingTask?: boolean;
  taskConversationId?: string | null;
  onTaskArrived?: () => void;
}) {
  const { data, refetch } = useFetchJson<Task[]>("/api/tasks");
  const [selected, setSelected] = useState<Task | null>(null);

  // Keep a stable ref to onTaskArrived so the effect doesn't need it as a dep
  const onTaskArrivedRef = useRef(onTaskArrived);
  onTaskArrivedRef.current = onTaskArrived;

  const allTasks = data ?? [];
  const pending = allTasks.filter((t) => !t.isCompleted);
  const visible = pending.slice(0, 10);
  const queueCount = Math.max(0, pending.length - 10);

  // Poll every 2s while expecting a task (up to 25 attempts = 50s total)
  useEffect(() => {
    if (!expectingTask) return;
    const first = setTimeout(() => refetch(), 600);
    let attempts = 0;
    const id = setInterval(() => {
      attempts++;
      refetch();
      if (attempts >= 25) clearInterval(id);
    }, 2000);
    return () => { clearTimeout(first); clearInterval(id); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expectingTask]);

  // Detect arrival: look for a pending task with the expected conversationId
  useEffect(() => {
    if (!expectingTask || !taskConversationId || data === null) return;
    const arrived = data.some(
      (t) => !t.isCompleted && t.conversationId === taskConversationId,
    );
    if (arrived) onTaskArrivedRef.current?.();
  }, [data, expectingTask, taskConversationId]);

  async function complete(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isCompleted: true }),
    });
    setSelected(null);
    refetch();
  }

  const noteText = visible.length > 0
    ? `${visible.length} task${visible.length > 1 ? "s" : ""} growing${queueCount > 0 ? ` · ${queueCount} more waiting` : ""}`
    : expectingTask
    ? "Your new task is on the way…"
    : "Complete a conversation to grow your first task";

  return (
    <PanelShell
      title="Task Tree"
      banner="/garden/memory-tree-zoomed.png"
      note={noteText}
      onClose={onClose}
      loading={data === null}
      empty={data !== null && visible.length === 0 && !expectingTask}
      emptyLabel="All caught up — complete more conversations to grow new tasks."
      overlay={
        visible.length > 0 || expectingTask ? (
          <>
            {visible.map((task, i) => (
              <TaskTag
                key={task.id}
                task={task}
                index={i}
                total={visible.length}
                onSelect={setSelected}
              />
            ))}

            {selected && (
              <TaskDetail
                task={selected}
                onClose={() => setSelected(null)}
                onComplete={complete}
              />
            )}

            <div className="garden-scene-panel-caption">
              {expectingTask && visible.length === 0 ? (
                <>
                  <h3>Growing your next task…</h3>
                  <p>It will appear here in a moment.</p>
                </>
              ) : (
                <>
                  <h3>Your practice garden.</h3>
                  <p>Hover a tag to preview — tap to open and mark done.</p>
                </>
              )}
            </div>
          </>
        ) : undefined
      }
    />
  );
}
