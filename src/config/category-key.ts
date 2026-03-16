const DESCRIPTIVE_CATEGORY_FIELD_CANDIDATES = [
  "category",
  "name",
  "localizedName",
  "key",
  "slug",
  "value",
  "code"
];

const IDENTIFIER_CATEGORY_FIELD_CANDIDATES = [
  "subCategoryId",
  "categoryId",
  "categoryID",
  "id"
];

function looksCanonicalCategoryId(value: string): boolean {
  return /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(value.trim());
}

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

function readFirstCategoryField(
  record: Record<string, unknown>,
  fields: readonly string[]
): string | undefined {
  for (const field of fields) {
    const value = record[field];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }

  return undefined;
}

function extractCanonicalCategoryHierarchy(
  record: Record<string, unknown>
): string[] {
  const normalized: string[] = [];
  const seen = new Set<string>();
  const parentIdentifier = readFirstCategoryField(record, [
    "categoryId",
    "categoryID"
  ]);
  const subCategoryIdentifier = readFirstCategoryField(record, ["subCategoryId"]);

  for (const candidate of [parentIdentifier, subCategoryIdentifier]) {
    if (!candidate || !looksCanonicalCategoryId(candidate)) {
      continue;
    }

    const normalizedCandidate = normalizeCategoryString(candidate);
    if (!normalizedCandidate || seen.has(normalizedCandidate)) {
      continue;
    }

    seen.add(normalizedCandidate);
    normalized.push(normalizedCandidate);
  }

  return normalized;
}

function extractCategoryString(category: unknown): string | undefined {
  if (typeof category === "string") {
    return category;
  }

  if (!category || typeof category !== "object") {
    return undefined;
  }

  const record = category as Record<string, unknown>;
  const identifierValue = readFirstCategoryField(
    record,
    IDENTIFIER_CATEGORY_FIELD_CANDIDATES
  );

  if (identifierValue && looksCanonicalCategoryId(identifierValue)) {
    return identifierValue;
  }

  const descriptiveValue = readFirstCategoryField(
    record,
    DESCRIPTIVE_CATEGORY_FIELD_CANDIDATES
  );

  if (descriptiveValue) {
    return descriptiveValue;
  }

  if (record.attributes && typeof record.attributes === "object") {
    const nestedValue = extractCategoryString(record.attributes);
    if (nestedValue) {
      return nestedValue;
    }
  }

  return identifierValue;
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
    if (value && typeof value === "object") {
      const hierarchy = extractCanonicalCategoryHierarchy(
        value as Record<string, unknown>
      );

      if (hierarchy.length > 0) {
        for (const key of hierarchy) {
          if (seen.has(key)) {
            continue;
          }

          seen.add(key);
          normalized.push(key);
        }

        continue;
      }
    }

    const key = normalizeCategoryKey(value);
    if (!key || seen.has(key)) {
      continue;
    }

    seen.add(key);
    normalized.push(key);
  }

  return normalized;
}
