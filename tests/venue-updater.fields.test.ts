import assert from "node:assert/strict";

import { applyVenueProposals } from "../src/integration/sdk/venue-updater.ts";
import type { PlaceProposal } from "../src/types/proposal.ts";

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

await runTest(
  "applies Google validation name and opening-hours proposals through the SDK venue updater",
  async () => {
    const hostWindow = globalThis as typeof globalThis & {
      window?: any;
      unsafeWindow?: any;
    };
    const previousUnsafeWindow = hostWindow.unsafeWindow;
    const targetWindow = hostWindow.window ?? (hostWindow.window = {});
    const previousGetWmeSdk = targetWindow.getWmeSdk;
    let updateArgs: Record<string, unknown> | undefined;

    const proposals: PlaceProposal[] = [
      {
        id: "externalProvider.validation.nameMismatch:provider-1",
        field: "name",
        currentValue: "TC Alkmaar",
        proposedValue: "TP Alkmaar | Tennis en Padelclub Alkmaar",
        reason: "Linked Google Place name differs",
        issueRuleId: "externalProvider.validation.nameMismatch",
        isApplySupported: true,
        actionType: "set-field"
      },
      {
        id: "externalProvider.validation.openingHoursDifferent:provider-1",
        field: "openingHours",
        currentValue: [],
        proposedValue: [
          {
            days: [1, 2, 3, 4, 5],
            fromHour: "08:00",
            toHour: "23:00"
          }
        ],
        reason: "Linked Google Place opening hours differ",
        issueRuleId: "externalProvider.validation.openingHoursDifferent",
        isApplySupported: true,
        actionType: "set-field"
      }
    ];

    const sdk = {
      DataModel: {
        Venues: {
          getById: ({ venueId }: { venueId: string }) => ({
            id: venueId
          }),
          updateVenue: (args: Record<string, unknown>) => {
            updateArgs = args;
          }
        }
      },
      State: {
        userInfo: {
          rank: 5
        }
      }
    };

    targetWindow.getWmeSdk = () => sdk;
    hostWindow.unsafeWindow = undefined;

    try {
      const result = await applyVenueProposals("venue-789", [], [], proposals);

      assert.equal(result.applied, 2);
      assert.equal(result.skipped, 0);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(updateArgs, {
        venueId: "venue-789",
        name: "TP Alkmaar | Tennis en Padelclub Alkmaar",
        openingHours: [
          {
            days: [1, 2, 3, 4, 5],
            fromHour: "08:00",
            toHour: "23:00"
          }
        ]
      });
    } finally {
      if (previousGetWmeSdk === undefined) {
        delete targetWindow.getWmeSdk;
      } else {
        targetWindow.getWmeSdk = previousGetWmeSdk;
      }
      hostWindow.unsafeWindow = previousUnsafeWindow;
    }
  }
);
