import type { IssueSeverity } from "../types/issue";
import type { WhitelistEntry } from "../types/whitelist";

export interface PendingWhitelistAction {
  key: string;
  venueId: string;
  groupKey: string;
  severity: IssueSeverity;
  message: string;
  field: string;
  entries: WhitelistEntry[];
  expiresAt: number;
}

interface PendingWhitelistActionRecord extends PendingWhitelistAction {
  timerId: ReturnType<typeof globalThis.setTimeout>;
}

const WHITELIST_UNDO_WINDOW_MS = 5000;
const pendingWhitelistActions = new Map<string, PendingWhitelistActionRecord>();

function toPendingWhitelistAction(
  action: PendingWhitelistActionRecord
): PendingWhitelistAction {
  const { timerId: _timerId, ...pendingAction } = action;
  return pendingAction;
}

export function getWhitelistUndoWindowMs(): number {
  return WHITELIST_UNDO_WINDOW_MS;
}

function buildPendingWhitelistActionKey(params: {
  venueId: string;
  groupKey: string;
}): string {
  return `${params.venueId}::${params.groupKey}`;
}

export function schedulePendingWhitelistAction(params: {
  venueId: string;
  groupKey: string;
  severity: IssueSeverity;
  message: string;
  field: string;
  entries: WhitelistEntry[];
  onExpire: (action: PendingWhitelistAction) => void;
}): PendingWhitelistAction {
  const key = buildPendingWhitelistActionKey({
    venueId: params.venueId,
    groupKey: params.groupKey
  });
  const existing = pendingWhitelistActions.get(key);

  if (existing) {
    globalThis.clearTimeout(existing.timerId);
    pendingWhitelistActions.delete(key);
  }

  const expiresAt = Date.now() + WHITELIST_UNDO_WINDOW_MS;
  const action: PendingWhitelistActionRecord = {
    key,
    venueId: params.venueId,
    groupKey: params.groupKey,
    severity: params.severity,
    message: params.message,
    field: params.field,
    entries: [...params.entries],
    expiresAt,
    timerId: globalThis.setTimeout(() => {
      const pendingAction = pendingWhitelistActions.get(key);

      if (!pendingAction) {
        return;
      }

      pendingWhitelistActions.delete(key);
      params.onExpire(toPendingWhitelistAction(pendingAction));
    }, WHITELIST_UNDO_WINDOW_MS)
  };

  pendingWhitelistActions.set(key, action);

  return toPendingWhitelistAction(action);
}

export function cancelPendingWhitelistAction(params: {
  venueId: string;
  groupKey: string;
}): PendingWhitelistAction | null {
  const key = buildPendingWhitelistActionKey({
    venueId: params.venueId,
    groupKey: params.groupKey
  });
  const action = pendingWhitelistActions.get(key);

  if (!action) {
    return null;
  }

  globalThis.clearTimeout(action.timerId);
  pendingWhitelistActions.delete(key);

  return toPendingWhitelistAction(action);
}

export function getPendingWhitelistActionsForVenue(
  venueId: string
): PendingWhitelistAction[] {
  return Array.from(pendingWhitelistActions.values())
    .filter((action) => action.venueId === venueId)
    .sort((left, right) => left.expiresAt - right.expiresAt)
    .map((action) => toPendingWhitelistAction(action));
}

export function clearPendingWhitelistActions(): void {
  for (const action of pendingWhitelistActions.values()) {
    globalThis.clearTimeout(action.timerId);
  }

  pendingWhitelistActions.clear();
}
