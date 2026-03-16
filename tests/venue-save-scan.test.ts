import assert from "node:assert/strict";

import {
  getSavedVenueIds,
  registerVenueSaveScanListener,
  resetVenueSaveScanListenerForTests
} from "../src/integration/sdk/venue-save-scan.ts";

function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`PASS ${name}`);
    })
    .catch((error) => {
      console.error(`FAIL ${name}`);
      throw error;
    });
}

await runTest("extracts saved venue ids only from venue save events", () => {
  assert.deepEqual(
    getSavedVenueIds({
      dataModelName: "venues",
      objectIds: ["123", 456, "123"]
    }),
    ["123", "456"]
  );

  assert.deepEqual(
    getSavedVenueIds({
      dataModelName: "segments",
      objectIds: ["123"]
    }),
    []
  );

  assert.deepEqual(
    getSavedVenueIds({
      dataModelName: "venues",
      objectIds: null
    }),
    []
  );
});

await runTest("rescans after venue save events", async () => {
  const hostWindow = globalThis as typeof globalThis & {
    window?: any;
    unsafeWindow?: any;
  };
  const previousWindow = hostWindow.window;
  const previousUnsafeWindow = hostWindow.unsafeWindow;
  let savedHandler:
    | ((event: { dataModelName?: string; objectIds?: Array<string | number> | null }) => void)
    | undefined;
  let trackedDataModelName: string | undefined;
  let scanCount = 0;

  const sdk = {
    Events: {
      trackDataModelEvents: ({ dataModelName }: { dataModelName: string }) => {
        trackedDataModelName = dataModelName;
      },
      on: ({
        eventName,
        eventHandler
      }: {
        eventName: string;
        eventHandler: (event: {
          dataModelName?: string;
          objectIds?: Array<string | number> | null;
        }) => void;
      }) => {
        if (eventName === "wme-data-model-objects-saved") {
          savedHandler = eventHandler;
        }
      }
    }
  };

  hostWindow.window = {
    clearTimeout: globalThis.clearTimeout.bind(globalThis),
    setTimeout: globalThis.setTimeout.bind(globalThis),
    getWmeSdk: () => sdk
  };
  hostWindow.unsafeWindow = undefined;
  resetVenueSaveScanListenerForTests();

  try {
    registerVenueSaveScanListener(async () => {
      scanCount += 1;
    });

    assert.equal(trackedDataModelName, "venues");
    assert.ok(savedHandler);

    savedHandler?.({
      dataModelName: "segments",
      objectIds: ["seg-1"]
    });

    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.equal(scanCount, 0);

    savedHandler?.({
      dataModelName: "venues",
      objectIds: ["venue-1"]
    });

    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.equal(scanCount, 1);
  } finally {
    resetVenueSaveScanListenerForTests();
    hostWindow.window = previousWindow;
    hostWindow.unsafeWindow = previousUnsafeWindow;
  }
});
