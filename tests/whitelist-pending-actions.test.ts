import assert from "node:assert/strict";

import {
  cancelPendingWhitelistAction,
  clearPendingWhitelistActions,
  getPendingWhitelistActionsForVenue,
  getWhitelistUndoWindowMs,
  schedulePendingWhitelistAction
} from "../src/whitelist/pending-actions.ts";

class FakeTimers {
  private nextId = 1;
  private readonly callbacks = new Map<number, () => void>();

  setTimeout(callback: () => void): number {
    const timerId = this.nextId;
    this.nextId += 1;
    this.callbacks.set(timerId, callback);
    return timerId;
  }

  clearTimeout(timerId: number): void {
    this.callbacks.delete(timerId);
  }

  runAll(): void {
    const callbacks = Array.from(this.callbacks.values());
    this.callbacks.clear();

    for (const callback of callbacks) {
      callback();
    }
  }
}

function buildEntry() {
  return {
    placeId: "123",
    ruleId: "phoneValidation.format",
    field: "phone",
    scope: "place" as const,
    createdAt: "2026-03-30T10:00:00Z",
    configId: "nl-config",
    configVersion: 3,
    chainsId: "nl-chains",
    chainsVersion: 7
  };
}

function runTest(name: string, fn: () => void): void {
  try {
    clearPendingWhitelistActions();
    fn();
    clearPendingWhitelistActions();
    console.log(`PASS ${name}`);
  } catch (error) {
    clearPendingWhitelistActions();
    console.error(`FAIL ${name}`);
    throw error;
  }
}

const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const timers = new FakeTimers();

(globalThis as typeof globalThis & {
  setTimeout: (callback: () => void, ms?: number) => number;
  clearTimeout: (timerId: number) => void;
}).setTimeout = (callback: () => void, ms?: number) => {
  assert.equal(ms, getWhitelistUndoWindowMs());
  return timers.setTimeout(callback);
};

(globalThis as typeof globalThis & {
  clearTimeout: (timerId: number) => void;
}).clearTimeout = (timerId: number) => {
  timers.clearTimeout(timerId);
};

runTest("tracks pending whitelist actions per venue until the timer expires", () => {
  const expiredKeys: string[] = [];

  schedulePendingWhitelistAction({
    venueId: "123",
    groupKey: "phone::phoneValidation.format",
    severity: "warning",
    message: "Phone number format is invalid",
    field: "phone",
    entries: [buildEntry()],
    onExpire: (action) => {
      expiredKeys.push(action.key);
    }
  });

  const actions = getPendingWhitelistActionsForVenue("123");

  assert.equal(actions.length, 1);
  assert.equal(actions[0].groupKey, "phone::phoneValidation.format");
  assert.equal(actions[0].message, "Phone number format is invalid");
  assert.equal(actions[0].entries.length, 1);

  timers.runAll();

  assert.deepEqual(expiredKeys, ["123::phone::phoneValidation.format"]);
  assert.equal(getPendingWhitelistActionsForVenue("123").length, 0);
});

runTest("cancels a pending whitelist action before it expires", () => {
  let expired = false;

  schedulePendingWhitelistAction({
    venueId: "123",
    groupKey: "phone::phoneValidation.format",
    severity: "warning",
    message: "Phone number format is invalid",
    field: "phone",
    entries: [buildEntry()],
    onExpire: () => {
      expired = true;
    }
  });

  const canceledAction = cancelPendingWhitelistAction({
    venueId: "123",
    groupKey: "phone::phoneValidation.format"
  });

  assert.ok(canceledAction);
  assert.equal(getPendingWhitelistActionsForVenue("123").length, 0);

  timers.runAll();

  assert.equal(expired, false);
});

(globalThis as typeof globalThis & {
  setTimeout: typeof originalSetTimeout;
  clearTimeout: typeof originalClearTimeout;
}).setTimeout = originalSetTimeout;

(globalThis as typeof globalThis & {
  clearTimeout: typeof originalClearTimeout;
}).clearTimeout = originalClearTimeout;
