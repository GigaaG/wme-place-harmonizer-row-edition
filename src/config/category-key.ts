const CATEGORY_FIELD_CANDIDATES = [
  "id",
  "categoryId",
  "categoryID",
  "code",
  "key",
  "slug",
  "value",
  "name",
  "category"
];

function normalizeCategoryString(value: string): string | undefined {
  const normalized = value
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_")
    .toUpperCase();

  return normalized.length > 0 ? normalized : undefined;
}

function extractCategoryString(category: unknown): string | undefined {
  if (typeof category === "string") {
    return category;
  }

  if (!category || typeof category !== "object") {
    return undefined;
  }

  const record = category as Record<string, unknown>;

  for (const field of CATEGORY_FIELD_CANDIDATES) {
    const value = record[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  if (record.attributes && typeof record.attributes === "object") {
    return extractCategoryString(record.attributes);
  }

  return undefined;
}

export function normalizeCategoryKey(category: unknown): string | undefined {
  const value = extractCategoryString(category);
  return value ? normalizeCategoryString(value) : undefined;
}

export function normalizeCategoryKeys(categories: unknown): string[] {
  const values = Array.isArray(categories) ? categories : [categories];
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const value of values) {
    const key = normalizeCategoryKey(value);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}
