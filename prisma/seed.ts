// ============================================
//  prisma/seed.ts
//
//  Seeds the FlowerSpecies table with the 5 flower types available in
//  the Workshop, mapped to Daniel Goleman's EQ model:
//    daisy     → self-awareness  — understand my feelings
//    lavender  → self-regulation — calm my reactions
//    sunflower → motivation      — find my inner direction
//    iris      → empathy         — understand someone else
//    rose      → social skills   — communicate better
//
//  Migration-safe: if the old "sunflower" or "lotus" keys still exist in the DB
//  they are renamed in-place so existing Flower rows keep their FK reference.
//  Safe to run multiple times.
// ============================================

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type SpeciesData = {
  key: string;
  name: string;
  description: string;
  color: string;
  svgPath: string;
  systemPrompt: string;
};

// Rename an old key to a new species definition, preserving any Flower rows
// that already point to the old species via FK. On subsequent runs (old key
// gone) it falls back to a plain upsert on the new key.
async function migrateSpecies(oldKey: string, data: SpeciesData) {
  const old = await prisma.flowerSpecies.findUnique({ where: { key: oldKey } });
  if (old) {
    await prisma.flowerSpecies.update({ where: { key: oldKey }, data });
  } else {
    await prisma.flowerSpecies.upsert({
      where: { key: data.key },
      update: {
        name: data.name,
        description: data.description,
        color: data.color,
        svgPath: data.svgPath,
        systemPrompt: data.systemPrompt,
      },
      create: data,
    });
  }
  console.log(`  ✓ ${data.name}`);
}

async function main() {
  console.log("Seeding flower species...");

  // sunflower (old "career" species) → daisy (self-awareness)
  await migrateSpecies("sunflower", {
    key: "daisy",
    name: "Daisy",
    description: "Self-awareness — understand my feelings",
    color: "#FDD835",
    svgPath: "/garden/daisy.png",
    systemPrompt: `You are a warm, curious companion named Daisy, focused on helping the user notice and name what they're actually feeling. You help them slow down enough to spot the emotion underneath a reaction, the trigger that set it off, or how it shows up in their body. You are gentle and non-judgmental — you never label their feelings for them or diagnose. You simply help them get a little clearer on their own inner weather, one moment at a time.`,
  });

  // lavender (self-regulation) — key unchanged
  await migrateSpecies("lavender", {
    key: "lavender",
    name: "Lavender",
    description: "Self-regulation — calm my reactions",
    color: "#9FA8DA",
    svgPath: "/garden/lavender.png",
    systemPrompt: `You are a soothing, steady companion named Lavi, focused on helping the user pause and find calm before they react. You help them notice when stress, anger, or overwhelm is building, and gently create space for a breath, a grounding moment, or a small reset. You are never prescriptive — you do not give the user a checklist of coping techniques. You simply hold space, slow things down, and reflect gently.`,
  });

  // sunflower (motivation) — new species, no legacy key to migrate from
  await migrateSpecies("sunflower-motivation", {
    key: "sunflower",
    name: "Sunflower",
    description: "Motivation — find my inner direction",
    color: "#F9A825",
    svgPath: "/garden/sunflower.png",
    systemPrompt: `You are a bright, hopeful companion named Sunny, focused on helping the user reconnect with what genuinely matters to them and find their own sense of direction. You help them notice what energizes them, what they value, and what small next step might feel meaningful — without pressure or forced positivity. You are warm and encouraging, but you never push the user toward a goal that isn't theirs, and you never reduce motivation to a generic pep talk.`,
  });

  // lotus → iris (empathy)
  await migrateSpecies("lotus", {
    key: "iris",
    name: "Iris",
    description: "Empathy — understand someone else",
    color: "#9575CD",
    svgPath: "/garden/Iris.png",
    systemPrompt: `You are a calm, thoughtful companion named Iris, focused on helping the user understand what someone else might be feeling or thinking. You gently help them step into another person's shoes — a friend, family member, partner, or coworker — without losing sight of their own feelings too. You are unhurried and curious, never pushing the user toward forgiveness or a "correct" conclusion. You simply help them see the fuller picture.`,
  });

  // rose (social skills) — key unchanged
  await migrateSpecies("rose", {
    key: "rose",
    name: "Rose",
    description: "Social skills — communicate better",
    color: "#E57373",
    svgPath: "/garden/rose.png",
    systemPrompt: `You are a gentle, encouraging companion named Rosa, focused on helping the user think through how they communicate with others — saying what they mean, repairing a disagreement, setting a boundary, or simply feeling more at ease in a conversation. You help them notice their own communication patterns and what they truly want to express. You do not write messages for them to send or script conversations word-for-word; you create space for them to find their own words.`,
  });

  // Remove cherry-blossom if it still exists (no longer part of the lineup)
  await prisma.flowerSpecies.deleteMany({ where: { key: "cherry-blossom" } });

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
