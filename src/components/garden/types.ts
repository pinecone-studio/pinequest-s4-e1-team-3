// ============================================
//  garden/types.ts
//
//  Shared response shapes for the Garden UI, mirrored from the
//  API route comments (see src/app/api/*/route.ts for the source
//  of truth). Centralizing them here means every panel imports
//  the same types instead of redeclaring its own slightly-different
//  copy of "what a flower/stone/note looks like".
// ============================================

export type GrowthStage = "SEED" | "SPROUT" | "YOUNG" | "MATURE" | "BLOOMING";

export interface SpeciesSummary {
  id: string;
  key: string;
  name: string;
  color: string;
  svgPath: string;
}

export interface Species extends SpeciesSummary {
  description: string;
}

export interface FlowerSummary {
  id: string;
  posX: number;
  posY: number;
  mood: string | null;
  growthStage: GrowthStage;
  summary: string | null;
  tags: string[];
  plantedAt: string;
  completedAt: string | null;
  species: SpeciesSummary;
  conversationId: string | null;
  /**
   * Other EQ areas the AI leaned on during this session (e.g. a Daisy
   * conversation that drew on Lavender's calming techniques), rendered as
   * small companion buds beside the main flower. Currently always `[]` from
   * GET /api/flowers — see detectSupportFlower() in flowerPrompts.ts for the
   * not-yet-wired detection logic.
   */
  supportFlowers?: SpeciesSummary[];
}

export interface Stone {
  id: string;
  mood: string;
  rippleColor: string;
  weather: string;
  intensity: number;
  date: string;
  conversationId: string | null;
  note: string | null;
}

export interface ForecastDay {
  date: string;
  mood: string;
  weather: string;
  rippleColor: string;
  stoneCount: number;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  conversationId: string | null;
}

export interface MemoryNode {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  conversationId: string;
  conversation: { flower: { species: { name: string; color: string } } };
}

export interface MemoryGraph {
  nodes: MemoryNode[];
  edges: { source: string; target: string; similarity: number }[];
}
