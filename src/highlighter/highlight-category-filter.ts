import { getCategoryWithDescendants } from "../config/category-hierarchy.ts";
import { normalizeCategoryKeys } from "../config/category-key.ts";

const NATURAL_FEATURE_HIGHLIGHT_CATEGORY_KEYS = new Set(
  getCategoryWithDescendants("NATURAL_FEATURES")
);

export function shouldSkipVenueHighlight(
  venue: any,
  disableNaturalFeaturesHighlighting: boolean
): boolean {
  if (!disableNaturalFeaturesHighlighting) {
    return false;
  }

  const categories = normalizeCategoryKeys(venue?.categories ?? []);

  return categories.some((categoryKey) =>
    NATURAL_FEATURE_HIGHLIGHT_CATEGORY_KEYS.has(categoryKey)
  );
}
