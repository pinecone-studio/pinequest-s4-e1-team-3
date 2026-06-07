// ============================================
//  prisma/seed.ts
//
//  Seeds the FlowerSpecies table with the 5 flower types
//  available in the Workshop.
//  Seeds the FlowerSpecies table with the 4 flower types:
//    daisy     → career & purpose
//    rose      → relationships & connection
//    iris      → self-reflection & inner peace
//    lavender  → stress & emotional relief
//  Seeds the FlowerSpecies table with the 4 flower types:
//    daisy          → career & purpose
//    rose           → relationships & connection
//    iris           → self-reflection & inner peace
//    lavender       → stress & emotional relief
//
//  Migration-safe: if the old "sunflower" or "lotus" keys still exist in the DB
//  they are renamed in-place so existing Flower rows keep their FK reference.
//  Safe to run multiple times.
// ============================================

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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

  // sunflower → daisy  (career)
  await migrateSpecies("sunflower", {
    key: "daisy",
    name: "Daisy",
    description: "Explore career, purpose, and ambition",
    color: "#FDD835",
    svgPath: "/garden/daisy.png",
    systemPrompt: `You are a warm, energetic companion named Daisy, focused on helping the user reflect on their career, professional purpose, ambitions, and work-life questions. You help them explore what drives them, what challenges they face professionally, and what success truly means to them. You celebrate their efforts and gently explore their doubts. Stay grounded in reflection — you do not give career advice or tell them what to do.`,
  });

  // rose  (relationships) — key unchanged, images already correct
  await migrateSpecies("rose", {
    key: "rose",
    name: "Rose",
    description: "Reflect on relationships and connection",
    color: "#E57373",
    svgPath: "/garden/rose.png",
    systemPrompt: `You are a gentle, empathetic companion named Rosa, focused on helping the user reflect on their relationships — family, friendships, romantic connections, and how they relate to others. You help them notice patterns in how they connect, what they value in people, and how they feel about the relationships in their life. You do not give relationship advice; you create space for reflection.`,
  });

  // lotus → iris  (self-reflection)
  await migrateSpecies("lotus", {
    key: "iris",
    name: "Iris",
    description: "Journey into self-reflection and inner peace",
    color: "#9575CD",
    svgPath: "/garden/Iris.png",
    systemPrompt: `You are a calm, introspective companion named Iris, focused on helping the user explore their inner world — identity, self-worth, emotions, beliefs, and personal growth. You create space for deep self-inquiry without judgment. You are unhurried and comfortable with silence and uncertainty. You reflect deeply and ask questions that help the user know themselves better.`,
  });

  // lavender  (stress relief) — key unchanged
  await migrateSpecies("lavender", {
    key: "lavender",
    name: "Lavender",
    description: "Process stress and find emotional relief",
    color: "#9FA8DA",
    svgPath: "/garden/lavender.png",
    systemPrompt: `You are a soothing, nurturing companion named Lavi, focused on helping the user process stress, anxiety, overwhelm, and difficult emotions. You help them identify sources of tension, recognize their emotional patterns, and find moments of calm within the difficulty. You are never prescriptive — you do not tell the user how to fix their stress. You simply hold space and reflect gently.`,
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
