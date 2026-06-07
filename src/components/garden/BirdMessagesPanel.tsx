"use client";

import { useEffect, useRef } from "react";
import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";

type BirdMessage = {
  id: string;
  type: "milestone" | "memory" | "mood" | "insight" | "nudge";
  icon: string;
  title: string;
  body: string;
  createdAt: string;
  color: string;
};

const PREVIEW_MESSAGES: BirdMessage[] = [
  {
    id: "preview-1",
    type: "milestone",
    icon: "🌸",
    title: "Your Lavender has bloomed",
    body: "After 7 days of conversations, your Lavender reached full bloom and carries 3 memories in your tree.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    color: "#b6a8cf",
  },
  {
    id: "preview-2",
    type: "memory",
    icon: "🍃",
    title: "A memory arrived in your tree",
    body: "\"I am enough, just as I am\" has been gently added to your Memory Tree.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    color: "#9aa87f",
  },
  {
    id: "preview-3",
    type: "mood",
    icon: "🌤️",
    title: "Your week in the garden",
    body: "This week, you had 4 conversations. Your garden felt mostly calm.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    color: "#d8c27a",
  },
  {
    id: "preview-4",
    type: "insight",
    icon: "✨",
    title: "A pattern noticed",
    body: "Your conversations most often carry reflections. Your garden is quietly learning who you are.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    color: "#cf8aa0",
  },
  {
    id: "preview-5",
    type: "nudge",
    icon: "🌱",
    title: "Your garden misses you",
    body: "It's been a little while. Your flowers are waiting quietly for a new conversation.",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    color: "#6b7c5a",
  },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = diff / (1000 * 60 * 60);
  const d = h / 24;
  if (h < 1) return "just now";
  if (h < 24) return `${Math.floor(h)}h ago`;
  if (d < 2) return "yesterday";
  if (d < 7) return `${Math.floor(d)} days ago`;
  if (d < 14) return "1 week ago";
  return `${Math.floor(d / 7)} weeks ago`;
}

export function BirdMessagesPanel({ onClose, refetchSignal }: { onClose: () => void; refetchSignal?: number }) {
  const { data, loading, refetch } = useFetchJson<BirdMessage[]>("/api/bird-messages");
  const usingPreview = !data || data.length === 0;
  const messages = usingPreview ? PREVIEW_MESSAGES : data!;

  const refetchRef = useRef(refetch);
  useEffect(() => { refetchRef.current = refetch; }, [refetch]);

  // When GardenShell gets an Ably event while this panel is open, it increments
  // refetchSignal — we immediately refetch to show the new message.
  useEffect(() => {
    if (refetchSignal) refetchRef.current();
  }, [refetchSignal]);

  // Fallback poll every 60 s for mood recap / insight / nudge messages.
  useEffect(() => {
    const id = setInterval(() => refetchRef.current(), 60_000);
    return () => clearInterval(id);
  }, []);

  return (
    <PanelShell
      title="Bird Messages"
      subtitle="Notes carried to you from the garden"
      banner="/garden/garden-bg.png"
      note="The birds have been busy."
      onClose={onClose}
      loading={loading}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.map((msg) => (
          <div
            key={msg.id}
            style={{
              display: "flex",
              gap: 14,
              padding: "13px 16px",
              borderRadius: 16,
              background: "rgba(247, 241, 228, 0.55)",
              border: `1.5px solid ${msg.color}40`,
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1, paddingTop: 2, flexShrink: 0 }}>
              {msg.icon}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13.5, color: "var(--g-ink)", marginBottom: 3 }}>
                {msg.title}
              </p>
              <p style={{ fontSize: 13, color: "var(--g-ink-soft)", lineHeight: 1.55 }}>
                {msg.body}
              </p>
              <p
                style={{
                  fontSize: 10.5,
                  color: msg.color,
                  fontWeight: 800,
                  marginTop: 7,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                {relativeTime(msg.createdAt)}
              </p>
            </div>
          </div>
        ))}
        {usingPreview && !loading && (
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: "var(--g-ink-soft)",
              marginTop: 4,
              fontStyle: "italic",
            }}
          >
            Complete conversations to grow your real messages ✦
          </p>
        )}
      </div>
    </PanelShell>
  );
}
