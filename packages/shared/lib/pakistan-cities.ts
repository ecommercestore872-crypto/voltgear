/**
 * @deprecated Prefer pakistan-locations.ts (province → city model).
 * Kept as a flat label list for any legacy datalist consumers.
 */
import { pakistanCityLabels } from "@/lib/pakistan-locations";

export const PAKISTAN_CITY_SUGGESTIONS = pakistanCityLabels() as readonly string[];
