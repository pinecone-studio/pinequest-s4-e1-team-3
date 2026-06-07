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
  SEED: { size: 26, petals: 5 },
  SPROUT: { size: 36, petals: 6 },
  YOUNG: { size: 46, petals: 7 },
  MATURE: { size: 56, petals: 8 },
  BLOOMING: { size: 66, petals: 10 },
};

/** Species keys we have painted illustrations for — everything else uses the generated glyph. */
const SPECIES_ART: Record<string, string> = {
  daisy: "/garden/daisy.png",
  rose: "/garden/rose.png",
  iris: "/garden/Iris.png",
  lavender: "/garden/lavender.png",
  iris: "/garden/Iris.png",
  daisy: "/garden/daisy.png",
};

const ART_SCALE: Record<GrowthStage, number> = {
  SEED: 64,
  SPROUT: 84,
  YOUNG: 104,
  MATURE: 124,
  BLOOMING: 148,
};

export function FlowerSprite({
  flower,
  onSelect,
  onHoverStart,
  dimmed = false,
  nightMode = false,
}: {
  flower: FlowerSummary;
  onSelect: (flower: FlowerSummary) => void;
  onHoverStart?: (flower: FlowerSummary) => void;
  dimmed?: boolean;
  nightMode?: boolean;
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
      style={{
        left: `${flower.posX}%`,
        top: `${flower.posY}%`,
        filter: dimmed
          ? "blur(3px) saturate(0.3)"
          : nightMode
          ? "drop-shadow(0 0 10px rgba(255, 210, 70, 0.85)) drop-shadow(0 0 20px rgba(255, 180, 40, 0.5))"
          : undefined,
        opacity: dimmed ? 0.35 : 1,
        transition: "filter 0.3s ease, opacity 0.3s ease",
        zIndex: dimmed ? 5 : 10,
      }}
      onClick={() => onSelect(flower)}
      onMouseEnter={() => { setHovered(true); onHoverStart?.(flower); }}
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
          <Image src={art} alt="" fill sizes="160px" style={{ objectFit: "contain" }} />
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
        <span
          className="garden-flower-card-icon"
          style={{ background: `${tint}28` }}
          aria-hidden
        >
          {art && (
            <Image
              src={art}
              alt=""
              fill
              sizes="48px"
              style={{ objectFit: "contain", padding: "4px" }}
            />
          )}
        </span>
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
