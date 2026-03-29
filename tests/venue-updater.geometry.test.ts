import assert from "node:assert/strict";

import { generateProposals } from "../src/proposals/generate-proposals.ts";
import { applyVenueProposals } from "../src/integration/sdk/venue-updater.ts";
import type { PlaceIssue } from "../src/types/issue.ts";
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
  "creates applyable geometry proposals for polygon to point changes",
  () => {
    const issue: PlaceIssue = {
      field: "geometry",
      severity: "warning",
      message: "Geometry should be point",
      currentValue: "polygon",
      expectedValue: "point",
      ruleId: "geometry.recommended"
    };

    const proposals = generateProposals([issue]);

    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].field, "geometry");
    assert.equal(proposals[0].proposedValue, "point");
    assert.equal(proposals[0].isApplySupported, true);
    assert.equal(proposals[0].actionType, "set-field");
  }
);

await runTest(
  "creates applyable geometry proposals for point to polygon changes",
  () => {
    const issue: PlaceIssue = {
      field: "geometry",
      severity: "warning",
      message: "Geometry should be polygon",
      currentValue: "point",
      expectedValue: "polygon",
      ruleId: "geometry.recommended"
    };

    const proposals = generateProposals([issue]);

    assert.equal(proposals.length, 1);
    assert.equal(proposals[0].field, "geometry");
    assert.equal(proposals[0].proposedValue, "polygon");
    assert.equal(proposals[0].isApplySupported, true);
    assert.equal(proposals[0].actionType, "set-field");
  }
);

await runTest(
  "applies polygon to point geometry proposals through the SDK venue updater",
  async () => {
    const hostWindow = globalThis as typeof globalThis & {
      window?: any;
      unsafeWindow?: any;
    };
    const previousUnsafeWindow = hostWindow.unsafeWindow;
    const targetWindow = hostWindow.window ?? (hostWindow.window = {});
    const previousGetWmeSdk = targetWindow.getWmeSdk;
    let updateArgs: Record<string, unknown> | undefined;

    const geometryProposal: PlaceProposal = {
      id: "geometry::geometry.recommended::point",
      field: "geometry",
      currentValue: "polygon",
      proposedValue: "point",
      reason: "Geometry should be point",
      issueRuleId: "geometry.recommended",
      isApplySupported: true,
      actionType: "set-field"
    };

    const sdk = {
      DataModel: {
        Venues: {
          getById: ({ venueId }: { venueId: string }) => ({
            id: venueId,
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [1, 2],
                  [5, 2],
                  [5, 6],
                  [1, 6],
                  [1, 2]
                ]
              ]
            }
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
      const result = await applyVenueProposals(
        "venue-123",
        [],
        [],
        [geometryProposal]
      );

      assert.equal(result.applied, 1);
      assert.equal(result.skipped, 0);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(updateArgs, {
        venueId: "venue-123",
        geometry: {
          type: "Point",
          coordinates: [3, 4]
        }
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

await runTest(
  "applies point to polygon geometry proposals through the SDK venue updater",
  async () => {
    const hostWindow = globalThis as typeof globalThis & {
      window?: any;
      unsafeWindow?: any;
    };
    const previousUnsafeWindow = hostWindow.unsafeWindow;
    const targetWindow = hostWindow.window ?? (hostWindow.window = {});
    const previousGetWmeSdk = targetWindow.getWmeSdk;
    let updateArgs: Record<string, unknown> | undefined;

    const geometryProposal: PlaceProposal = {
      id: "geometry::geometry.recommended::polygon",
      field: "geometry",
      currentValue: "point",
      proposedValue: "polygon",
      reason: "Geometry should be polygon",
      issueRuleId: "geometry.recommended",
      isApplySupported: true,
      actionType: "set-field"
    };

    const sdk = {
      DataModel: {
        Venues: {
          getById: ({ venueId }: { venueId: string }) => ({
            id: venueId,
            geometry: {
              type: "Point",
              coordinates: [0, 0]
            }
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
      const result = await applyVenueProposals(
        "venue-456",
        [],
        [],
        [geometryProposal]
      );

      assert.equal(result.applied, 1);
      assert.equal(result.skipped, 0);
      assert.deepEqual(result.errors, []);
      assert.equal(updateArgs?.venueId, "venue-456");

      const geometry = updateArgs?.geometry as {
        type: string;
        coordinates: number[][][];
      };

      assert.equal(geometry.type, "Polygon");
      assert.equal(geometry.coordinates.length, 1);
      assert.equal(geometry.coordinates[0].length, 5);
      assert.deepEqual(
        geometry.coordinates[0][0],
        geometry.coordinates[0][4]
      );
      assert.equal(geometry.coordinates[0][0][0], -geometry.coordinates[0][1][0]);
      assert.equal(geometry.coordinates[0][0][1], geometry.coordinates[0][1][1]);
      assert.equal(geometry.coordinates[0][1][1], -geometry.coordinates[0][2][1]);
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
