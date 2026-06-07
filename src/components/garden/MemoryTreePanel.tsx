// ============================================
//  MemoryTreePanel.tsx
//
//  Lists the insights the AI has extracted across all conversations
//  (GET /api/memories). The backend already computes similarity
//  edges for a graph view — for this first pass we render the
//  simpler "list of memory leaves" form: each node as a row, tinted
//  by the species color of the flower/conversation it grew from.
//
//  A graph/canvas rendering of `edges` can be layered on top of this
//  same data later without touching how the data is fetched.
// ============================================

"use client";

import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";
import type { MemoryGraph } from "./types";

export function MemoryTreePanel({ onClose }: { onClose: () => void }) {
  const { data, loading, error } = useFetchJson<MemoryGraph>("/api/memories");
  const nodes = data?.nodes ?? [];

  return (
    <PanelShell
      title="Memory Tree"
      banner="/garden/memory-tree-zoomed.png"
      subtitle="The heart of your garden — everything you've grown is held here"
      note="Birds carry your memories here — each tag is a moment."
      onClose={onClose}
      loading={loading}
      error={error}
      empty={nodes.length === 0}
      emptyLabel="No memories yet — they grow once a conversation finishes."
    >
      {nodes.map((node) => (
        <div key={node.id} className="garden-row" style={{ alignItems: "flex-start" }}>
          <span
            className="garden-dot"
            style={{ background: node.conversation.flower.species.color, marginTop: 4 }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13.5, lineHeight: 1.5 }}>{node.content}</div>
            <div style={{ fontSize: 11.5, color: "var(--g-ink-soft)", marginTop: 4 }}>
              {node.type} · grown from {node.conversation.flower.species.name} ·{" "}
              {new Date(node.createdAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </div>
          </div>
        </div>
      ))}
    </PanelShell>
  );
}
