// ============================================
//  GET /api/species
//
//  Returns all flower species available in the Workshop.
//  The Workshop is the screen shown before starting a new conversation
//  where the user picks which type of flower (= emotional intention) they want.
//
//  This endpoint is called once when the Workshop page loads.
//  The response is the same for all users — species are global seed data.
//
//  Response shape:
//  [
//    {
//      id: string,
//      key: "sunflower" | "rose" | "lotus" | "lavender" | "cherry-blossom",
//      name: string,
//      description: string,  ← shown in the picker card
//      color: string,        ← hex, used for flower tint in UI
//      svgPath: string       ← path to SVG asset in /public/flowers/
//    },
//    ...
//  ]
//
//  Note: systemPrompt is intentionally excluded from the response —
//  it's an internal AI configuration field, not needed by the frontend.
//
//  Seeding: run `npx prisma db seed` to populate this table.
//  See prisma/seed.ts for the species definitions.
// ============================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const species = await prisma.flowerSpecies.findMany({
    select: {
      id: true,
      key: true,
      name: true,
      description: true,
      color: true,
      svgPath: true,
      // systemPrompt is intentionally omitted — it's an internal AI field
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(species);
}
