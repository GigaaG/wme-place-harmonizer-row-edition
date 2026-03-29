import sdkValues from "../../../wme-place-harmonizer-row-data/reference/sdk-values.json" with { type: "json" };

type SdkValuesSnapshot = {
  mainCategories?: string[];
  subCategoriesByMainCategory?: Record<string, string[]>;
};

const snapshot = sdkValues as SdkValuesSnapshot;

const PARENT_BY_SUBCATEGORY = new Map<string, string>();

for (const [mainCategory, subCategories] of Object.entries(
  snapshot.subCategoriesByMainCategory ?? {}
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
