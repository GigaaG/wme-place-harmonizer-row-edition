import assert from "node:assert/strict";

import { CACHE_KEYS } from "../src/constants/cache.ts";
import { loadManifest } from "../src/config/manifest-loader.ts";
import { loadConfigFile } from "../src/config/config-loader.ts";
import { loadChainFile } from "../src/config/chain-loader.ts";
import { resolveRuntimeConfig } from "../src/config/runtime-config.ts";
import { resolveRuntimeChains } from "../src/config/runtime-chains.ts";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  clear(): void {
    this.values.clear();
  }
}

type MockResponse = {
  status?: number;
  body?: unknown;
  networkError?: boolean;
};

const localStorage = new MemoryStorage();
const warnMessages: string[] = [];

(globalThis as typeof globalThis & {
  window: { localStorage: MemoryStorage };
  GM_xmlhttpRequest: (details: {
    url: string;
    onload: (response: { status: number; responseText: string }) => void;
    onerror?: (error: unknown) => void;
  }) => void;
}).window = {
  localStorage
};

const originalConsoleWarn = console.warn;
console.warn = (message?: unknown, ...rest: unknown[]): void => {
  warnMessages.push(String(message ?? ""));
  originalConsoleWarn(message, ...rest);
};

function getRepoRelativePath(url: string): string {
  const parsed = new URL(url);
  const marker = "/wme-place-harmonizer-row-data/";
  const markerIndex = parsed.pathname.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(`Unexpected data repository URL: ${url}`);
  }

  const tail = parsed.pathname.slice(markerIndex + marker.length);
  const [, ...pathSegments] = tail.split("/");
  return pathSegments.join("/");
}

function installResponses(responses: Record<string, MockResponse>): void {
  (globalThis as typeof globalThis & {
    GM_xmlhttpRequest: (details: {
      url: string;
      onload: (response: { status: number; responseText: string }) => void;
      onerror?: (error: unknown) => void;
    }) => void;
  }).GM_xmlhttpRequest = ({ url, onload, onerror }) => {
    const response = responses[getRepoRelativePath(url)];

    if (!response) {
      onload({ status: 404, responseText: "Not Found" });
      return;
    }

    if (response.networkError) {
      onerror?.(new Error("Network error"));
      return;
    }

    onload({
      status: response.status ?? 200,
      responseText:
        typeof response.body === "string"
          ? response.body
          : JSON.stringify(response.body ?? {})
    });
  };
}

function resetTestState(): void {
  localStorage.clear();
  warnMessages.length = 0;
}

async function runTest(
  name: string,
  fn: () => Promise<void> | void
): Promise<void> {
  try {
    resetTestState();
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

await runTest("falls back to a cached manifest when the fetched manifest is invalid", async () => {
  localStorage.setItem(
    CACHE_KEYS.manifest,
    JSON.stringify({
      channel: "stable",
      version: "cached-1",
      generatedAt: "2026-03-19T00:00:00Z",
      dataRevision: "cached-revision",
      files: {
        "config/global.json": { required: true },
        "chains/global.json": { required: true }
      }
    })
  );

  installResponses({
    "manifest/stable.json": {
      body: {
        channel: "stable",
        version: "broken",
        generatedAt: "not-a-date",
        dataRevision: "broken-revision",
        files: {}
      }
    }
  });

  const manifest = await loadManifest("stable");

  assert.equal(manifest.version, "cached-1");
  assert.ok(
    warnMessages.some((message) =>
      message.includes("Manifest load failed: Manifest generatedAt must be a valid ISO timestamp")
    )
  );
});

await runTest("rejects invalid config files that are missing critical rule shape", async () => {
  installResponses({
    "config/global.json": {
      body: {
        id: "global",
        type: "global-config",
        version: 1,
        rules: {
          cityInVenueName: {
            enabled: true
          }
        }
      }
    }
  });

  await assert.rejects(
    () => loadConfigFile("config/global.json"),
    /Config rule must define valid severity/
  );
});

await runTest("logs the fallback cause and uses global config when country config is invalid", async () => {
  installResponses({
    "config/global.json": {
      body: {
        id: "global",
        type: "global-config",
        version: 1,
        defaults: {
          locale: "en"
        },
        rules: {
          cityInVenueName: {
            enabled: false,
            severity: "warning"
          }
        },
        categoryStandards: {}
      }
    },
    "config/countries/nl.json": {
      body: {
        type: "country-config",
        version: 1
      }
    }
  });

  const config = await resolveRuntimeConfig("nl");

  assert.equal(config.id, "global");
  assert.ok(
    warnMessages.some((message) =>
      message.includes("Country config nl could not be loaded: Config id must be a non-empty string")
    )
  );
});

await runTest("rejects invalid chain datasets that are missing canonical names", async () => {
  installResponses({
    "chains/global.json": {
      body: {
        id: "global-chains",
        type: "chain-dataset",
        version: 1,
        items: [
          {
            id: "test-chain"
          }
        ]
      }
    }
  });

  await assert.rejects(
    () => loadChainFile("chains/global.json"),
    /Chain item canonicalName must be a non-empty string/
  );
});

await runTest("logs the fallback cause and uses global chains when country chains are invalid", async () => {
  installResponses({
    "chains/global.json": {
      body: {
        id: "global-chains",
        type: "chain-dataset",
        version: 1,
        items: [
          {
            id: "test-chain",
            canonicalName: "Test Chain"
          }
        ]
      }
    },
    "chains/countries/nl.json": {
      body: {
        id: "nl-chains",
        type: "chain-dataset",
        version: 1,
        items: [
          {
            id: "broken-chain"
          }
        ]
      }
    }
  });

  const chains = await resolveRuntimeChains("nl");

  assert.equal(chains.id, "global-chains");
  assert.ok(
    warnMessages.some((message) =>
      message.includes(
        "Country chain dataset nl could not be loaded: Chain item canonicalName must be a non-empty string"
      )
    )
  );
});
