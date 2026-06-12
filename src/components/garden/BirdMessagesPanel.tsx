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
    title: "Таны Лаванда дэлгэрлээ",
    body: "7 хоногийн ярианы дараа таны Лаванда бүрэн дэлгэрч, таны мод дээр 3 дурсамж тээж байна.",
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    color: "#b6a8cf",
  },
  {
    id: "preview-2",
    type: "memory",
    icon: "🍃",
    title: "Таны мод дээр дурсамж иржээ",
    body: "«Би одоо байгаагаараа хангалттай» гэдэг үг таны Дурсамжийн мод дээр зөөлөн нэмэгдлээ.",
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    color: "#9aa87f",
  },
  {
    id: "preview-3",
    type: "mood",
    icon: "🌤️",
    title: "Цэцэрлэг дэх таны долоо хоног",
    body: "Энэ долоо хоногт чи 4 яриа өрнүүлжээ. Таны цэцэрлэг ихэвчлэн тайван байлаа.",
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    color: "#d8c27a",
  },
  {
    id: "preview-4",
    type: "insight",
    icon: "✨",
    title: "Нэгэн хэв маяг ажиглагдлаа",
    body: "Таны яриа ихэвчлэн эргэцүүллээр дүүрэн байдаг. Таны цэцэрлэг чамайг чимээгүйхэн таньж байна.",
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    color: "#cf8aa0",
  },
  {
    id: "preview-5",
    type: "nudge",
    icon: "🌱",
    title: "Таны цэцэрлэг чамайг санаж байна",
    body: "Багахан хугацаа өнгөрлөө. Таны цэцэгс шинэ яриаг чимээгүйхэн хүлээж байна.",
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    color: "#6b7c5a",
  },
];

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const h = diff / (1000 * 60 * 60);
  const d = h / 24;
  if (h < 1) return "дөнгөж сая";
  if (h < 24) return `${Math.floor(h)} цагийн өмнө`;
  if (d < 2) return "өчигдөр";
  if (d < 7) return `${Math.floor(d)} хоногийн өмнө`;
  if (d < 14) return "1 долоо хоногийн өмнө";
  return `${Math.floor(d / 7)} долоо хоногийн өмнө`;
}

export function BirdMessagesPanel({ onClose, refetchSignal }: { onClose: () => void; refetchSignal?: number }) {
  const { data, loading, error, refetch } = useFetchJson<BirdMessage[]>("/api/bird-messages");
  const usingPreview = !error && (!data || data.length === 0);
  const messages = usingPreview ? PREVIEW_MESSAGES : (data ?? []);

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
      title="Шувууны захиа"
      subtitle="Цэцэрлэгээс таньд авчирсан захианууд"
      banner="/garden/garden-bg.png"
      note="Шувууд завгүй байжээ."
      onClose={onClose}
      loading={loading}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {error && (
          <p style={{ fontSize: 12, color: "#c0392b", padding: "8px 12px", background: "rgba(192,57,43,0.08)", borderRadius: 10 }}>
            {error}
          </p>
        )}
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
Жинхэнэ захиануудаа ургуулахын тулд яриагаа дуусгаарай ✦
          </p>
        )}
      </div>
    </PanelShell>
  );
}
