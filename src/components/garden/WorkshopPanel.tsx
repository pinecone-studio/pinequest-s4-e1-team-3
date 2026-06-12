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
import { SPECIES_NAME_MN, SPECIES_DESC_MN } from "./speciesText";
import type { Species } from "./types";

const SPECIES_ART: Record<string, string> = {
  rose: "/garden/rose.png",
  lavender: "/garden/lavender.png",
  iris: "/garden/Iris.png",
  daisy: "/garden/daisy.png",
  sunflower: "/garden/sunflower.png",
};

// Positions aligning each flower sprite with the pots in green-house-zoomed.png
const POT_POSITIONS = [
  { x: 16, y: 76 },
  { x: 32, y: 76 },
  { x: 50, y: 76 },
  { x: 68, y: 76 },
  { x: 84, y: 76 },
];

// EQ-flow order (Self-Awareness → Self-Regulation → Motivation → Empathy →
// Social Skills) — /api/species returns alphabetical order, so re-sort here
// to keep the Greenhouse laid out as a deliberate progression.
const SPECIES_ORDER = ["daisy", "lavender", "sunflower", "iris", "rose"];

// What each flower represents — shown as a persistent label above every pot
// so the choice reads as "pick any of these", not "pick the middle one".
// Colors are darkened from the species palette for legibility on the chip.
const SPECIES_DOMAIN: Record<string, { label: string; color: string }> = {
  daisy: { label: "Өөрийгөө таних", color: "#a98a1f" },
  lavender: { label: "Өөрийгөө зохицуулах", color: "#7e6fb0" },
  sunflower: { label: "Урам зориг", color: "#cf8118" },
  iris: { label: "Бусдыг ойлгох", color: "#6f63ad" },
  rose: { label: "Бусадтай харилцах", color: "#c06384" },
};


export function WorkshopPanel({
  onClose,
  onPlanted,
}: {
  onClose: () => void;
  onPlanted: (flowerId?: string, conversationId?: string) => void;
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
      if (!res.ok) throw new Error("Энэ үрийг тарьж чадсангүй — дахин оролдоно уу.");
      const planted = (await res.json()) as { id: string; conversationId?: string };
      onPlanted(planted.id, planted.conversationId);
    } catch (err) {
      setPlantError(err instanceof Error ? err.message : "Алдаа гарлаа");
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
          aria-label="Цэцэрлэг рүү буцах"
        >
          ‹
        </button>
        <h2 className="garden-scene-panel-title">Хүлэмж</h2>
      </div>

      <p className="garden-scene-panel-note">
        <span className="pin" aria-hidden/>
        Өнөөдөр юу ургуулахаа сонгоорой.
      </p>

      {/* Tutorial target: anchors the flower-picker spotlight. Covers the
          flowers themselves (which rise well above the pots) plus their
          labels, not just the pot row at the bottom. */}
      <div
        data-tutorial-target="flower-picker"
        style={{
          position: "absolute",
          left: "4%",
          top: "29%",
          width: "92%",
          height: "54%",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {loading && (
        <p style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", color: "var(--g-ivory)", fontSize: 13, zIndex: 3, whiteSpace: "nowrap" }}>
          Ачаалж байна…
        </p>
      )}
      {plantError && (
        <p style={{ position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)", color: "#b0673f", fontSize: 13, background: "rgba(247,241,228,0.93)", padding: "8px 18px", borderRadius: 10, zIndex: 3, whiteSpace: "nowrap" }}>
          {plantError}
        </p>
      )}

      {!loading && (species ?? [])
        .slice()
        .sort((a, b) => SPECIES_ORDER.indexOf(a.key) - SPECIES_ORDER.indexOf(b.key))
        .map((s: Species, i: number) => {
        const pos = POT_POSITIONS[i] ?? { x: 50, y: 68 };
        const art = SPECIES_ART[s.key];
        const isHovered = hovered === s.id;
        const isDisabled = !!planting;

        return (
          <button
            key={s.id}
            type="button"
            className="wp-flower-pick"
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
              zIndex: isHovered ? 6 : 3,
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
              <span
                className="wp-flower-art"
                style={{ position: "relative", width: 148, height: 148, display: "block", filter: "drop-shadow(0 12px 18px rgba(20,20,10,.38))", ['--bob-delay' as string]: `${-(i * 0.35).toFixed(2)}s`, ['--bob-dur' as string]: `${(2.8 + (i % 3) * 0.35).toFixed(2)}s` }}
              >
                <Image src={art} alt={s.name} fill sizes="148px" style={{ objectFit: "contain" }} />
              </span>
            ) : (
              <span
                className="wp-flower-art"
                style={{ position: "relative", width: 44, height: 44, display: "block", ['--bob-delay' as string]: `${-(i * 0.35).toFixed(2)}s`, ['--bob-dur' as string]: `${(2.8 + (i % 3) * 0.35).toFixed(2)}s` }}
              >
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

            {/* Persistent label: every flower shows its name + what it
                represents, so all options read as choosable. The fuller
                description fades in on hover. */}
            {(() => {
              const domain = SPECIES_DOMAIN[s.key];
              const nameMn = SPECIES_NAME_MN[s.key] ?? s.name;
              const descMn = SPECIES_DESC_MN[s.key];
              return (
                <span style={{
                  position: "absolute",
                  bottom: "calc(100% + 4px)",
                  left: "50%",
                  transform: isHovered && !isDisabled ? "translateX(-50%) translateY(-4px)" : "translateX(-50%)",
                  background: "rgba(247,241,228,0.95)",
                  backdropFilter: "blur(10px)",
                  borderRadius: 12,
                  padding: "6px 12px",
                  maxWidth: 140,
                  pointerEvents: "none",
                  opacity: isDisabled && !isHovered ? 0.5 : 1,
                  transition: "transform 0.18s ease, opacity 0.18s ease",
                  textAlign: "center",
                  boxShadow: "0 8px 22px rgba(40,34,18,0.18)",
                  border: `1.5px solid ${domain?.color ?? s.color}40`,
                  zIndex: 5,
                }}>
                  <span style={{ display: "block", fontFamily: "'Cormorant Garamond', Georgia, serif", fontWeight: 600, fontSize: 15, color: "var(--g-ink)", lineHeight: 1.15 }}>{nameMn}</span>
                  <span style={{ display: "block", fontSize: 9.5, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: domain?.color ?? "var(--g-ink-soft)", marginTop: 2 }}>
                    {domain?.label ?? "Дэмжигч"}
                  </span>
                  {isHovered && !isDisabled && descMn && (
                    <span style={{ display: "block", fontSize: 11, color: "var(--g-ink-soft)", marginTop: 5, lineHeight: 1.4, whiteSpace: "normal" }}>{descMn}</span>
                  )}
                </span>
              );
            })()}
          </button>
        );
      })}
    </div>
  );
}
