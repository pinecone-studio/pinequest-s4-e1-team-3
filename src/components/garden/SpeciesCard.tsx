// ============================================
//  SpeciesCard.tsx
//
//  One pickable flower-type card in the Workshop. Pure display +
//  a single onPick callback — WorkshopPanel decides what picking
//  actually does (call the API, navigate, show errors).
//
//  The flower glyph reuses the same petal-ring look as FlowerSprite
//  but at a fixed "bloom" size, since species in the Workshop are
//  shown as their full-grown form (you're choosing an intention,
//  not a growth stage).
// ============================================

"use client";

import type { Species } from "./types";

export function SpeciesCard({
  species,
  disabled,
  onPick,
}: {
  species: Species;
  disabled?: boolean;
  onPick: (species: Species) => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onPick(species)}
      className="garden-row"
      style={{ width: "100%", textAlign: "left", cursor: disabled ? "wait" : "pointer", opacity: disabled ? 0.6 : 1 }}
    >
      <span style={{ position: "relative", width: 30, height: 30, flex: "0 0 30px" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <span
            key={i}
            className="garden-petal"
            style={{
              background: species.color,
              width: 13,
              height: 19,
              transform: `translate(-50%,-100%) rotate(${i * 40}deg)`,
              opacity: 0.92,
            }}
          />
        ))}
        <span className="garden-fcore" style={{ background: "#e0c860", width: 10, height: 10, margin: "10px auto 0" }} />
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 14 }}>{species.name}</div>
        <div style={{ fontSize: 12, color: "var(--g-ink-soft)" }}>{species.description}</div>
      </div>
    </button>
  );
}
