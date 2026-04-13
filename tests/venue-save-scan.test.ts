import assert from "node:assert/strict";

import {
  getSavedVenueIds,
  registerVenueSaveScanListener,
  resetVenueSaveScanListenerForTests
} from "../src/integration/sdk/venue-save-scan.ts";
import {
  resolveCountryCodeFromCountryId
} from "../src/integration/sdk/venue-country.ts";
import {
  mapVenueToPlaceLike
} from "../src/integration/sdk/venue-mapper.ts";

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
  const previousUnsafeWindow = hostWindow.unsafeWindow;
  const targetWindow = hostWindow.window ?? (hostWindow.window = {});
  const previousGetWmeSdk = targetWindow.getWmeSdk;
  const previousClearTimeout = targetWindow.clearTimeout;
  const previousSetTimeout = targetWindow.setTimeout;
  let savedHandler:
    | ((event: { dataModelName?: string; objectIds?: Array<string | number> | null }) => void)
    | undefined;
  let trackedDataModelName: string | undefined;
  let scanCount = 0;
  let lastSavedVenueIds: string[] | undefined;

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

  targetWindow.clearTimeout = globalThis.clearTimeout.bind(globalThis);
  targetWindow.setTimeout = globalThis.setTimeout.bind(globalThis);
  targetWindow.getWmeSdk = () => sdk;
  hostWindow.unsafeWindow = undefined;
  resetVenueSaveScanListenerForTests();

  try {
    registerVenueSaveScanListener(async (savedVenueIds) => {
      scanCount += 1;
      lastSavedVenueIds = savedVenueIds;
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
    assert.deepEqual(lastSavedVenueIds, ["venue-1"]);
  } finally {
    resetVenueSaveScanListenerForTests();
    if (previousGetWmeSdk === undefined) {
      delete targetWindow.getWmeSdk;
    } else {
      targetWindow.getWmeSdk = previousGetWmeSdk;
    }

    if (previousClearTimeout === undefined) {
      delete targetWindow.clearTimeout;
    } else {
      targetWindow.clearTimeout = previousClearTimeout;
    }

    if (previousSetTimeout === undefined) {
      delete targetWindow.setTimeout;
    } else {
      targetWindow.setTimeout = previousSetTimeout;
    }

    hostWindow.unsafeWindow = previousUnsafeWindow;
  }
});

await runTest("resolves country codes through the documented countryId lookup", () => {
  const hostWindow = globalThis as typeof globalThis & {
    window?: any;
    unsafeWindow?: any;
  };
  const previousUnsafeWindow = hostWindow.unsafeWindow;
  const targetWindow = hostWindow.window ?? (hostWindow.window = {});
  const previousGetWmeSdk = targetWindow.getWmeSdk;

  targetWindow.getWmeSdk = () => ({
    DataModel: {
      Countries: {
        getById: ({ countryId }: { countryId: number }) => {
          assert.equal(countryId, 84);
          return {
            name: "the Netherlands"
          };
        },
        getAll() {
          throw new Error("unexpected fallback lookup");
        }
      }
    }
  });
  hostWindow.unsafeWindow = undefined;

  try {
    assert.equal(resolveCountryCodeFromCountryId("84"), "nl");
  } finally {
    if (previousGetWmeSdk === undefined) {
      delete targetWindow.getWmeSdk;
    } else {
      targetWindow.getWmeSdk = previousGetWmeSdk;
    }

    hostWindow.unsafeWindow = previousUnsafeWindow;
  }
});

await runTest("maps venue address and country from one SDK address read", () => {
  const hostWindow = globalThis as typeof globalThis & {
    window?: any;
    unsafeWindow?: any;
  };
  const previousUnsafeWindow = hostWindow.unsafeWindow;
  const targetWindow = hostWindow.window ?? (hostWindow.window = {});
  const previousGetWmeSdk = targetWindow.getWmeSdk;
  let addressReads = 0;

  targetWindow.getWmeSdk = () => ({
    DataModel: {
      Venues: {
        getAddress: ({ venueId }: { venueId: string }) => {
          addressReads += 1;
          assert.equal(venueId, "venue-1");

          return {
            isEmpty: false,
            city: {
              name: "Alkmaar"
            },
            street: {
              name: "Kanaalkade",
              englishName: "Kanaalkade"
            },
            houseNumber: "12",
            country: {
              name: "the Netherlands"
            }
          };
        }
      }
    }
  });
  hostWindow.unsafeWindow = undefined;

  try {
    const place = mapVenueToPlaceLike({
      id: "venue-1",
      name: "Test Venue",
      categories: [],
      openingHours: [],
      externalProviderIds: []
    });

    assert.equal(addressReads, 1);
    assert.deepEqual(place.address, {
      city: "Alkmaar",
      street: "Kanaalkade",
      houseNumber: "12"
    });
    assert.equal(place.country, "nl");
  } finally {
    if (previousGetWmeSdk === undefined) {
      delete targetWindow.getWmeSdk;
    } else {
      targetWindow.getWmeSdk = previousGetWmeSdk;
    }

    hostWindow.unsafeWindow = previousUnsafeWindow;
  }
});
