// ============================================
//  speciesText.ts
//
//  Mongolian display labels for the flower species. The DB seeds English
//  names/descriptions ("Lavender", "Self-regulation — calm my reactions");
//  these maps keep the UI fully Mongolian without reseeding.
// ============================================

/** Flower name shown in the greenhouse + chat header. */
export const SPECIES_NAME_MN: Record<string, string> = {
  daisy: "Хонин нүдэн цэцэг",
  lavender: "Лаванда цэцэг",
  sunflower: "Наран цэцэг",
  iris: "Цахилдаг цэцэг",
  rose: "Сарнай цэцэг",
};

/** Short "what it helps with" line shown under a flower on hover. */
export const SPECIES_DESC_MN: Record<string, string> = {
  daisy: "Өөрийн мэдрэмжээ таньж ойлгох",
  lavender: "Мэдрэмжээ удирдах",
  sunflower: "Хүсэл эрмэлзлээ олох",
  iris: "Бусдын мэдрэмжийг таньж мэдэх",
  rose: "Бусадтай зөв харилцах",
};

export function speciesNameMn(key: string, fallback?: string): string {
  return SPECIES_NAME_MN[key] ?? fallback ?? "Дэмжигч";
}
