import sdkValues from "../../../wme-place-harmonizer-row-data/reference/sdk-values.json" with { type: "json" };

type SdkValuesSnapshot = {
  mainCategories?: string[];
  subCategoriesByMainCategory?: Record<string, string[]>;
};

const snapshot = sdkValues as SdkValuesSnapshot;
const SUBCATEGORIES_BY_MAIN_CATEGORY = snapshot.subCategoriesByMainCategory ?? {};

const PARENT_BY_SUBCATEGORY = new Map<string, string>();

for (const [mainCategory, subCategories] of Object.entries(
  SUBCATEGORIES_BY_MAIN_CATEGORY
)) {
  for (const subCategory of subCategories) {
    PARENT_BY_SUBCATEGORY.set(subCategory, mainCategory);
  }
}

export function expandCategoryHierarchy(categoryKey: string): string[] {
  const parentCategory = PARENT_BY_SUBCATEGORY.get(categoryKey);

  if (!parentCategory || parentCategory === categoryKey) {
    return [categoryKey];
  }

  return [parentCategory, categoryKey];
}

export function getCategoryWithDescendants(categoryKey: string): string[] {
  const descendants = SUBCATEGORIES_BY_MAIN_CATEGORY[categoryKey] ?? [];
  const seen = new Set<string>();
  const categories: string[] = [];

  for (const candidate of [categoryKey, ...descendants]) {
    if (seen.has(candidate)) {
      continue;
    }

    seen.add(candidate);
    categories.push(candidate);
  }

  return categories;
}
