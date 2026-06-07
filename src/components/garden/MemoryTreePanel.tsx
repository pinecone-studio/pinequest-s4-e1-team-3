// ============================================
//  MemoryTreePanel.tsx
//
//  Lists the insights the AI has extracted across all conversations
//  (GET /api/memories), shown as little fabric tags hung across the
//  painted tree — each one a memory, scattered at a position derived
//  from its own id (so it stays put across refetches instead of
//  jumping around). Each tag carries a short phrase clipped from the
//  memory's content; hovering or focusing it opens a card with the
//  full text, tinted by the species color of the conversation it
//  grew from.
//
//  The backend already computes similarity edges for a graph view —
//  this first pass keeps to the simpler "tags on the tree" form;
//  a connecting-lines layer can be added later without touching how
//  the data is fetched or positioned.
// ============================================

"use client";

import { useState } from "react";
import Image from "next/image";
import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";
import type { MemoryGraph, MemoryNode } from "./types";

/** Deterministic 0..1 pseudo-random derived from a string — keeps each tag's spot stable across refetches. */
function seededRandom(seed: string, salt: number) {
  let h = salt;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(h, 31) + seed.charCodeAt(i)) | 0;
  }
  return ((h >>> 0) % 10000) / 10000;
}

/** Spreads tags evenly left-to-right across the canopy, alternating between a higher and
 *  lower band so they zigzag like the reference — with a touch of per-tag jitter so an
 *  evenly-spaced row doesn't look mechanical. Hangs straight down, no rotation. */
function tagLayout(node: MemoryNode, index: number, total: number) {
  const slot = total <= 1 ? 0.5 : index / (total - 1);
  const jitter = seededRandom(node.id, 1) - 0.5;
  const band = index % 2;
  return {
    left: 9 + slot * 76 + jitter * 6,
    top: 8 + band * 21 + seededRandom(node.id, 2) * 12,
  };
}

function MemoryTag({ node, index, total }: { node: MemoryNode; index: number; total: number }) {
  const [open, setOpen] = useState(false);
  const { left, top } = tagLayout(node, index, total);
  const tint = node.conversation.flower.species.color;

  return (
    <button
      type="button"
      className="garden-memory-tag"
      style={{ left: `${left}%`, top: `${top}%` }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => setOpen((v) => !v)}
    >
      <span className="garden-memory-tag-art" style={{ filter: `drop-shadow(0 8px 14px ${tint}66)` }}>
        <Image src="/garden/tag-memory-tree.png" alt="" fill sizes="84px" style={{ objectFit: "contain" }} />
      </span>

      <span className={"garden-memory-card" + (open ? " visible" : "")}>
        <span className="garden-memory-card-dot" style={{ background: tint }} aria-hidden />
        <span>
          <span className="eyebrow">
            {node.type} · {node.conversation.flower.species.name}
          </span>
          <span className="content">{node.content}</span>
          <span className="date">
            {new Date(node.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </span>
      </span>
    </button>
  );
}

export function MemoryTreePanel({ onClose }: { onClose: () => void }) {
  const { data, loading, error } = useFetchJson<MemoryGraph>("/api/memories");
  const nodes = data?.nodes ?? [];

  return (
    <PanelShell
      title="Memory Tree"
      banner="/garden/memory-tree-zoomed.png"
      note="Birds carry your memories here — each tag is a moment."
      onClose={onClose}
      loading={loading}
      error={error}
      empty={nodes.length === 0}
      emptyLabel="No memories yet — they grow once a conversation finishes."
      overlay={
        <>
          {nodes.map((node, index) => (
            <MemoryTag key={node.id} node={node} index={index} total={nodes.length} />
          ))}
          <div className="garden-scene-panel-caption">
            <h3>The heart of your garden.</h3>
            <p>Everything you&rsquo;ve grown is held here. Hover a tag to remember.</p>
          </div>
        </>
      }
    />
  );
}
