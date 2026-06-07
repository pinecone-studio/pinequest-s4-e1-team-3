// ============================================
//  WorkshopPanel.tsx
//
//  Greenhouse scene where the user picks a flower species to plant.
//  Species are shown as flower sprites positioned over the four pots
//  on the table in the painted scene — clicking one calls POST /api/flowers
//  and redirects to /chat/[conversationId].
// ============================================

"use client";

import { useState } from "react";
import Image from "next/image";
import { useFetchJson } from "@/hooks/useFetchJson";
import type { Species } from "./types";

const SPECIES_ART: Record<string, string> = {
  rose: "/garden/rose.png",
  lavender: "/garden/lavender.png",
  iris: "/garden/Iris.png",
  daisy: "/garden/daisy.png",
};

// Positions aligning each flower sprite with the pots in green-house-zoomed.png
const POT_POSITIONS = [
  { x: 24, y: 76 },
  { x: 38, y: 76 },
  { x: 54, y: 76 },
  { x: 68, y: 76 },
];


export function WorkshopPanel({
  onClose,
  onPlanted,
}: {
  onClose: () => void;
  onPlanted: () => void;
}) {
  const { data: species, loading } = useFetchJson<Species[]>("/api/species");
  const [planting, setPlanting] = useState<string | null>(null);
  const [plantError, setPlantError] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);

  async function plant(picked: Species) {
    if (planting) return;
    setPlanting(picked.id);
    setPlantError("");

    // Mock species: skip the API, open the chat panel directly
    if (picked.id.startsWith("mock-")) {
      onPlanted();
      return;
    }

    try {
      const res = await fetch("/api/flowers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ speciesId: picked.id }),
      });
      if (!res.ok) throw new Error("Could not plant that seed — try again.");
      await res.json();
      onPlanted();
    } catch (err) {
      setPlantError(err instanceof Error ? err.message : "Something went wrong");
      setPlanting(null);
    }
  }

  return (
    <div className="garden-scene-panel">
      <Image
        src="/garden/green-house-zoomed.png"
        alt=""
        fill
        priority
        sizes="840px"
        style={{ objectFit: "cover" }}
      />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(20,18,10,0.32) 0%, rgba(20,18,10,0.08) 22%, rgba(20,18,10,0.08) 65%, rgba(20,18,10,0.38) 100%)" }} />

      <div className="garden-scene-panel-back">
        <button
          type="button"
          className="garden-scene-panel-back-btn"
          onClick={onClose}
          aria-label="Back to garden"
        >
          ‹
        </button>
        <h2 className="garden-scene-panel-title">Greenhouse</h2>
      </div>

      <p className="garden-scene-panel-note">
        <span className="pin" aria-hidden/>
        Plant your intentions. Nurture your future.
      </p>

      {loading && (
        <p style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", color: "var(--g-ivory)", fontSize: 13, zIndex: 3, whiteSpace: "nowrap" }}>
          Loading…
        </p>
      )}
      {plantError && (
        <p style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", color: "#b0673f", fontSize: 13, background: "rgba(247,241,228,0.93)", padding: "8px 18px", borderRadius: 10, zIndex: 3, whiteSpace: "nowrap" }}>
          {plantError}
        </p>
      )}

      {!loading && (species ?? []).map((s: Species, i: number) => {
        const pos = POT_POSITIONS[i] ?? { x: 50, y: 68 };
        const art = SPECIES_ART[s.key];
        const isHovered = hovered === s.id;
        const isDisabled = !!planting;

        return (
          <button
            key={s.id}
            type="button"
            disabled={isDisabled}
            onClick={() => plant(s)}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              position: "absolute",
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: isHovered && !isDisabled
                ? "translate(-50%, -100%) translateY(-8px)"
                : "translate(-50%, -100%)",
              zIndex: 3,
              cursor: isDisabled ? "wait" : "pointer",
              opacity: planting && planting !== s.id ? 0.45 : 1,
              transition: "transform 0.2s ease, opacity 0.2s ease",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              background: "none",
              border: "none",
              padding: 0,
            }}
          >
            {art ? (
              <span style={{ position: "relative", width: 148, height: 148, display: "block", filter: "drop-shadow(0 12px 18px rgba(20,20,10,.38))" }}>
                <Image src={art} alt={s.name} fill sizes="148px" style={{ objectFit: "contain" }} />
              </span>
            ) : (
              <span style={{ position: "relative", width: 44, height: 44, display: "block" }}>
                {Array.from({ length: 10 }).map((_, j) => (
                  <span
                    key={j}
                    className="garden-petal"
                    style={{
                      background: s.color,
                      width: 44 * 0.42,
                      height: 44 * 0.62,
                      transform: `translate(-50%,-100%) rotate(${(j * 360) / 10}deg)`,
                      opacity: 0.92,
                    }}
                  />
                ))}
                <span
                  className="garden-fcore"
                  style={{ background: "#e0c860", width: 44 * 0.34, height: 44 * 0.34, margin: `${44 * 0.33}px auto 0` }}
                />
              </span>
            )}
            <span style={{ position: "relative", width: 114, height: 94, display: "block", marginTop: -38, filter: "drop-shadow(0 8px 14px rgba(20,20,10,.32))" }}>
              <Image src="/garden/vase.png" alt="" fill sizes="114px" style={{ objectFit: "contain" }} />
            </span>

            <span style={{
              position: "absolute",
              bottom: "calc(100% + 10px)",
              left: "50%",
              transform: "translateX(-50%)",
              background: "rgba(247,241,228,0.95)",
              backdropFilter: "blur(10px)",
              borderRadius: 12,
              padding: "8px 14px",
              whiteSpace: "nowrap",
              pointerEvents: "none",
              opacity: isHovered && !isDisabled ? 1 : 0,
              transition: "opacity 0.15s ease",
              textAlign: "center",
              boxShadow: "0 8px 24px rgba(40,34,18,0.18)",
              zIndex: 4,
            }}>
              <span style={{ display: "block", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 15, color: "var(--g-ink)" }}>{s.name}</span>
              <span style={{ display: "block", fontSize: 11, color: "var(--g-ink-soft)", marginTop: 2 }}>{s.description}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
