// ============================================
//  PondPanel.tsx
//
//  Shows every "stone" the user has thrown into the pond — one
//  stone per completed conversation (GET /api/mood). Each stone
//  already carries its rippleColor/weather/intensity computed by
//  the backend (see moodMapping.ts), so this file is pure display:
//  a chronological list of colored stones with their mood + date.
//
//  Wrapped by PanelShell for the overlay chrome (close button,
//  loading/empty states, title) shared across all garden panels.
// ============================================

"use client";

import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";
import type { Stone } from "./types";

export function PondPanel({ onClose }: { onClose: () => void }) {
  const { data: stones, loading, error } = useFetchJson<Stone[]>("/api/mood");

  return (
    <PanelShell
      title="Mood Pond"
      banner="/garden/pond-zoomed.png"
      subtitle="Every stone is a conversation that came to rest"
      note="Toss a stone into the water — a quiet moment, watch it ripple away."
      onClose={onClose}
      loading={loading}
      error={error}
      empty={(stones?.length ?? 0) === 0}
      emptyLabel="No stones yet — finish a conversation to throw your first one in."
    >
      {(stones ?? []).map((stone) => (
        <div key={stone.id} className="garden-row">
          <span
            className="garden-dot"
            style={{
              background: stone.rippleColor,
              width: 10 + stone.intensity * 3,
              height: 10 + stone.intensity * 3,
              flexBasis: 10 + stone.intensity * 3,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, textTransform: "capitalize" }}>
              {stone.mood}
            </div>
            <div style={{ fontSize: 12, color: "var(--g-ink-soft)" }}>
              {new Date(stone.date).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}{" "}
              · weather: {stone.weather.replace("_", " ")}
            </div>
          </div>
        </div>
      ))}
    </PanelShell>
  );
}
