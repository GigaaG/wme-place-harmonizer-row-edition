import type { ChainDataset, ChainRecord } from "../types/chains";
import type { ChainMatchResult } from "../types/match";
import type { PlaceLike } from "../types/place";
import { normalizeText } from "./normalize";

function matchesCanonicalName(placeName: string, chain: ChainRecord): boolean {
  return normalizeText(placeName) === normalizeText(chain.canonicalName);
}

function matchesAlias(placeName: string, chain: ChainRecord): string | null {
  const aliases = chain.match?.aliases ?? [];
  const normalizedPlaceName = normalizeText(placeName);

  for (const alias of aliases) {
    if (normalizedPlaceName === normalizeText(alias)) {
      return alias;
    }
  }

  return null;
}

function matchesRegex(placeName: string, chain: ChainRecord): string | null {
  const patterns = chain.match?.regex ?? [];

  for (const pattern of patterns) {
    try {
      const regex = new RegExp(pattern, "i");
      if (regex.test(placeName)) {
        return pattern;
      }
    } catch {
      // Ignore invalid regex for now; schema validation will handle this later.
    }
  }

  return null;
}

export function matchPlaceToChain(
  place: PlaceLike,
  dataset: ChainDataset
): ChainMatchResult {
  for (const chain of dataset.items) {
    if (matchesCanonicalName(place.name, chain)) {
      return {
        matched: true,
        method: "canonical",
        chain,
        matchedValue: chain.canonicalName
      };
    }

    const aliasMatch = matchesAlias(place.name, chain);
    if (aliasMatch) {
      return {
        matched: true,
        method: "alias",
        chain,
        matchedValue: aliasMatch
      };
    }

    const regexMatch = matchesRegex(place.name, chain);
    if (regexMatch) {
      return {
        matched: true,
        method: "regex",
        chain,
        matchedValue: regexMatch
      };
    }
  }

  return {
    matched: false,
    method: "none"
  };
}