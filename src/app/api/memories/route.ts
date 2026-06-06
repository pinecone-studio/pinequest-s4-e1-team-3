// ============================================
//  GET /api/memories
//
//  Returns all extracted memories for the authenticated user.
//  Used by the Memory Tree visualization to render nodes and edges.
//
//  The Memory Tree is an interactive graph where:
//    - Each memory is a NODE
//    - Related memories (high cosine similarity) are connected by EDGES
//    - Node size/color reflects the memory category
//    - Hovering shows the full memory content and source conversation
//
//  This endpoint returns all nodes. Edge calculation (semantic similarity
//  between memories) is computed here on the backend — the frontend
//  receives ready-to-render nodes + edges and does not need to run
//  any vector math.
//
//  Edge logic:
//    Two memories are connected if their cosine similarity > EDGE_THRESHOLD.
//    We compute this by comparing each memory's embedding against others
//    using pgvector. Only memories with embeddings participate in edges.
//
//  Optional query params:
//    ?category=goal|concern|lesson|value|...  → filter by category
//    ?withEdges=true                          → include edge connections (default: true)
//    ?limit=N                                 → limit number of memories returned
//
//  Response shape:
//  {
//    nodes: [
//      {
//        id, content, type, createdAt,
//        conversationId,
//        conversation: { flower: { species: { name, color } } }
//      }
//    ],
//    edges: [
//      { source: memoryId, target: memoryId, similarity: number }
//    ]
//  }
//
//  If ?withEdges=false, edges array will be empty (faster for large datasets).
// ============================================

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getUser } from "@/lib/getUser";

// Minimum cosine similarity to draw an edge between two memories.
// 0.80 means memories must be strongly related to be visually connected.
// Lower this value (e.g. 0.70) to show more connections in the tree.
const EDGE_THRESHOLD = 0.80;

export async function GET(req: Request) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category") ?? undefined;
  const withEdges = searchParams.get("withEdges") !== "false"; // default true
  const limitParam = searchParams.get("limit");
  const limit = limitParam ? parseInt(limitParam, 10) : undefined;

  // --- Load all memory nodes ---
  const memories = await prisma.memory.findMany({
    where: {
      userId: user.id,
      ...(category ? { type: category as any } : {}),
    },
    select: {
      id: true,
      content: true,
      type: true,
      createdAt: true,
      conversationId: true,
      conversation: {
        select: {
          flower: {
            select: {
              species: { select: { name: true, color: true, key: true } },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    ...(limit ? { take: limit } : {}),
  });

  // --- Compute edges via pgvector similarity ---
  // Only run if withEdges=true and there are at least 2 memories with embeddings.
  let edges: Array<{ source: string; target: string; similarity: number }> = [];

  if (withEdges && memories.length >= 2) {
    try {
      // Find pairs of memories with cosine similarity above the threshold.
      // We only compare each pair once (m1.id < m2.id) to avoid duplicates.
      // This uses pgvector's <=> operator (cosine distance; similarity = 1 - distance).
      const pairs = await prisma.$queryRaw<
        { id1: string; id2: string; similarity: number }[]
      >(
        Prisma.sql`
          SELECT
            m1.id AS id1,
            m2.id AS id2,
            1 - (m1.embedding <=> m2.embedding) AS similarity
          FROM "Memory" m1
          JOIN "Memory" m2 ON m1.id < m2.id
          WHERE m1."userId" = ${user.id}
            AND m2."userId" = ${user.id}
            AND m1.embedding IS NOT NULL
            AND m2.embedding IS NOT NULL
            AND 1 - (m1.embedding <=> m2.embedding) > ${EDGE_THRESHOLD}
          ORDER BY similarity DESC
        `
      );

      edges = pairs.map((p) => ({
        source: p.id1,
        target: p.id2,
        similarity: Number(p.similarity),
      }));
    } catch {
      // Edge computation failed (e.g. no embeddings yet) — return nodes only
      edges = [];
    }
  }

  return NextResponse.json({ nodes: memories, edges });
}
