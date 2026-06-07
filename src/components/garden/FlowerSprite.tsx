// ============================================
//  FlowerSprite.tsx
//
//  Renders ONE flower on the garden field at its stored (posX, posY)
//  position. Species we have painted artwork for (see SPECIES_ART)
//  render as that illustration; everything else falls back to the
//  generated petal-ring glyph so any species/color from the DB still
//  renders correctly without a matching image file.
//
//  Visual size scales with growthStage so the player can see a
//  flower's progress at a glance:
//    SEED → tiny bud · SPROUT/YOUNG/MATURE → fuller bloom · BLOOMING → largest
//
//  Hovering reveals a small painted info card (name + planted date +
//  its first topic tag, if the AI has extracted one yet) — mirroring
//  the "label on hover" affordance from the original glyph but with
//  the richer card treatment from the reference design.
// ============================================

"use client";

import { useState } from "react";
import Image from "next/image";
import type { FlowerSummary, GrowthStage } from "./types";

const STAGE_SCALE: Record<GrowthStage, { size: number; petals: number }> = {
  SEED: { size: 14, petals: 5 },
  SPROUT: { size: 19, petals: 6 },
  YOUNG: { size: 24, petals: 7 },
  MATURE: { size: 29, petals: 8 },
  BLOOMING: { size: 34, petals: 10 },
};

/** Species keys we have painted illustrations for — everything else uses the generated glyph. */
const SPECIES_ART: Record<string, string> = {
  rose: "/garden/rose.png",
  lavender: "/garden/lavender.png",
};

const ART_SCALE: Record<GrowthStage, number> = {
  SEED: 30,
  SPROUT: 42,
  YOUNG: 54,
  MATURE: 66,
  BLOOMING: 80,
};

export function FlowerSprite({
  flower,
  onSelect,
}: {
  flower: FlowerSummary;
  onSelect: (flower: FlowerSummary) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { size, petals } = STAGE_SCALE[flower.growthStage];
  const tint = flower.species.color;
  const art = SPECIES_ART[flower.species.key];
  const eyebrow = flower.tags[0] ? flower.tags[0].replace(/[-_]/g, " ") : flower.growthStage.toLowerCase();

  return (
    <button
      type="button"
      className="garden-flower"
      style={{ left: `${flower.posX}%`, top: `${flower.posY}%` }}
      onClick={() => onSelect(flower)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      {art ? (
        <span
          style={{
            position: "relative",
            width: ART_SCALE[flower.growthStage],
            height: ART_SCALE[flower.growthStage],
            display: "block",
            filter: "drop-shadow(0 10px 16px rgba(20,20,10,.28))",
          }}
        >
          <Image src={art} alt="" fill sizes="80px" style={{ objectFit: "contain" }} />
        </span>
      ) : (
        <span style={{ position: "relative", width: size, height: size, display: "block" }}>
          {Array.from({ length: petals }).map((_, i) => (
            <span
              key={i}
              className="garden-petal"
              style={{
                background: tint,
                width: size * 0.42,
                height: size * 0.62,
                transform: `translate(-50%,-100%) rotate(${(i * 360) / petals}deg)`,
                opacity: 0.92,
              }}
            />
          ))}
          <span
            className="garden-fcore"
            style={{
              background: "#e0c860",
              width: size * 0.34,
              height: size * 0.34,
              margin: `${size * 0.33}px auto 0`,
            }}
          />
        </span>
      )}

      <span className={"garden-flower-card" + (hovered ? " visible" : "")}>
        <span className="garden-flower-card-icon" style={{ background: tint }} aria-hidden />
        <span>
          <span className="eyebrow">{eyebrow}</span>
          <span className="name">{flower.species.name}</span>
          <span className="date">
            {new Date(flower.plantedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          </span>
        </span>
      </span>
    </button>
  );
}
