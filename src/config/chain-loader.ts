import { logger } from "../logging/logger.ts";
import { fetchJson } from "../network/fetch-json.ts";
import { getConfigUrl } from "./config-source.ts";
import type { ChainDataset } from "../types/chains.ts";

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

export function validateChainDataset(
  value: unknown,
  path: string
): ChainDataset {
  if (!isPlainObject(value)) {
    throw new Error(`Chain dataset must be a JSON object: ${path}`);
  }

  const dataset = value as Partial<ChainDataset>;

  if (dataset.type !== "chain-dataset") {
    throw new Error(`Chain dataset type must be 'chain-dataset': ${path}`);
  }

  if (!hasNonEmptyString(dataset.id)) {
    throw new Error(`Chain dataset id must be a non-empty string: ${path}`);
  }

  if (!Number.isInteger(dataset.version) || dataset.version < 1) {
    throw new Error(`Chain dataset version must be a positive integer: ${path}`);
  }

  if (!Array.isArray(dataset.items)) {
    throw new Error(`Chain dataset items must be an array: ${path}`);
  }

  for (const item of dataset.items) {
    if (!isPlainObject(item)) {
      throw new Error(`Chain dataset item must be an object: ${path}`);
    }

    if (!hasNonEmptyString(item.id)) {
      throw new Error(`Chain item id must be a non-empty string: ${path}`);
    }

    if (!hasNonEmptyString(item.canonicalName)) {
      throw new Error(`Chain item canonicalName must be a non-empty string: ${path}`);
    }

    if (item.match !== undefined) {
      if (!isPlainObject(item.match)) {
        throw new Error(`Chain item match must be an object: ${path} -> ${item.id}`);
      }

      if (
        item.match.aliases !== undefined &&
        !isStringArray(item.match.aliases)
      ) {
        throw new Error(`Chain match.aliases must be string[]: ${path} -> ${item.id}`);
      }

      if (
        item.match.regex !== undefined &&
        !isStringArray(item.match.regex)
      ) {
        throw new Error(`Chain match.regex must be string[]: ${path} -> ${item.id}`);
      }
    }

    for (const optionalObjectKey of ["standard", "policy", "editorNotes"] as const) {
      if (
        item[optionalObjectKey] !== undefined &&
        !isPlainObject(item[optionalObjectKey])
      ) {
        throw new Error(
          `Chain item ${optionalObjectKey} must be an object: ${path} -> ${item.id}`
        );
      }
    }
  }

  return dataset as ChainDataset;
}

export async function loadChainFile(path: string): Promise<ChainDataset> {
  const url = getConfigUrl(path);

  logger.info(`Loading chains ${path}`);

  const result = validateChainDataset(await fetchJson<unknown>(url), path);

  logger.info(
    `Loaded chain dataset ${result.id} v${result.version} with ${result.items.length} items`
  );

  return result;
}
