// ============================================
//  speciesText.ts
//
//  Mongolian display labels for the flower species. The DB seeds English
//  names/descriptions ("Lavender", "Self-regulation — calm my reactions");
//  these maps keep the UI fully Mongolian without reseeding.
// ============================================

/** Flower name shown in the greenhouse + chat header. */
export const SPECIES_NAME_MN: Record<string, string> = {
  daisy: "Маргаритка",
  lavender: "Лаванда",
  sunflower: "Наран цэцэг",
  iris: "Цахилдаг",
  rose: "Сарнай",
};

/** Short "what it helps with" line shown under a flower on hover. */
export const SPECIES_DESC_MN: Record<string, string> = {
  daisy: "Өөрийн мэдрэмжээ таньж ойлгох",
  lavender: "Хариу үйлдлээ тайвшруулах",
  sunflower: "Дотоод эрмэлзлээ олох",
  iris: "Бусдын сэтгэлийг ойлгох",
  rose: "Бусадтай илүү сайн харилцах",
};

export function speciesNameMn(key: string, fallback?: string): string {
  return SPECIES_NAME_MN[key] ?? fallback ?? "Дэмжигч";
}
