// ============================================
//  WorkshopPanel.tsx
//
//  Where a new conversation is born. Lists the flower species from
//  GET /api/species (rendered by <SpeciesCard>); picking one calls
//  POST /api/flowers, which atomically creates the Flower + its
//  Conversation, then we route straight into /chat/[conversationId].
//
//  `planting` tracks which species was just picked so the card can
//  show a waiting state and the rest of the list can be disabled —
//  prevents double-submits while the redirect is in flight.
// ============================================

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useFetchJson } from "@/hooks/useFetchJson";
import { PanelShell } from "./PanelShell";
import { SpeciesCard } from "./SpeciesCard";
import type { Species } from "./types";

export function WorkshopPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { data: species, loading, error } = useFetchJson<Species[]>("/api/species");
  const [planting, setPlanting] = useState<string | null>(null);
  const [plantError, setPlantError] = useState("");

  async function plant(picked: Species) {
    if (planting) return;
    setPlanting(picked.id);
    setPlantError("");
    try {
      const res = await fetch("/api/flowers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesId: picked.id }),
      });
      if (!res.ok) throw new Error("Could not plant that seed — try again.");
      const flower = await res.json();
      router.push(`/chat/${flower.conversationId}`);
    } catch (err) {
      setPlantError(err instanceof Error ? err.message : "Something went wrong");
      setPlanting(null);
    }
  }

  return (
    <PanelShell
      title="Greenhouse"
      banner="/garden/green-house-zoomed.png"
      subtitle="Choose the intention you'd like to explore"
      note="Plant your intentions. Nurture your future."
      onClose={onClose}
      loading={loading}
      error={error}
      empty={(species?.length ?? 0) === 0}
      emptyLabel="No flower types are available yet."
    >
      {plantError && <p style={{ color: "#b0673f", fontSize: 12.5, marginBottom: 10 }}>{plantError}</p>}
      {(species ?? []).map((s) => (
        <SpeciesCard key={s.id} species={s} disabled={!!planting} onPick={plant} />
      ))}
    </PanelShell>
  );
}
