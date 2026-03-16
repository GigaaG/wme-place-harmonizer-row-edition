import { logger } from "../../logging/logger.ts";
import { normalizeText } from "../../matching/normalize.ts";
import type { PlaceProposal } from "../../types/proposal.ts";

const EXTERNAL_PROVIDER_ADD_BUTTON_SELECTORS = [
  ".external-providers-control .external-provider-add-new"
];

const EXTERNAL_PROVIDER_AUTOCOMPLETE_SELECTORS = [
  ".external-providers-control > wz-list.external-providers-list > wz-list-item.external-provider-edit > div.external-provider-edit-form > div.form-group > wz-autocomplete",
  "wz-autocomplete[name=\"external-providers-control\"]",
  ".external-providers-control wz-autocomplete"
];

export interface ExternalProviderEditorCandidate {
  providerId: string;
  name: string;
  address?: string;
  sortIndex: number;
}

interface ExternalProviderMenuCandidate extends ExternalProviderEditorCandidate {
  element: HTMLElement;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function findExternalProviderAddButton(): HTMLElement | null {
  for (const selector of EXTERNAL_PROVIDER_ADD_BUTTON_SELECTORS) {
    const button = document.querySelector<HTMLElement>(selector);

    if (button) {
      return button;
    }
  }

  return null;
}

function readAutocompleteInput(autocomplete: Element): HTMLInputElement | null {
  const shadowRoot = (autocomplete as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;

  if (!shadowRoot) {
    return null;
  }

  return (
    shadowRoot.querySelector<HTMLInputElement>("#text-input") ??
    shadowRoot.querySelector<HTMLInputElement>("input")
  );
}

function findExternalProviderAutocomplete(): Element | null {
  for (const selector of EXTERNAL_PROVIDER_AUTOCOMPLETE_SELECTORS) {
    const autocomplete = document.querySelector(selector);

    if (!autocomplete) {
      continue;
    }

    return autocomplete;
  }

  return null;
}

function findExternalProviderInput(): HTMLInputElement | null {
  const autocomplete = findExternalProviderAutocomplete();

  if (!autocomplete) {
    return null;
  }

  const input = readAutocompleteInput(autocomplete);

  if (input) {
    return input;
  }

  return null;
}

export function resolveInputValueSetter(
  input: Pick<HTMLInputElement, "ownerDocument"> & object
): ((value: string) => void) | undefined {
  const ownerWindow = input.ownerDocument?.defaultView;
  const prototypeCandidates = [
    Object.getPrototypeOf(input),
    ownerWindow?.HTMLInputElement?.prototype,
    typeof HTMLInputElement !== "undefined"
      ? HTMLInputElement.prototype
      : undefined
  ];

  for (const prototype of prototypeCandidates) {
    const valueSetter = Object.getOwnPropertyDescriptor(
      prototype ?? {},
      "value"
    )?.set;

    if (typeof valueSetter === "function") {
      return (value: string) => {
        valueSetter.call(input, value);
      };
    }
  }

  return undefined;
}

export function dismissExternalProviderAutocompleteInput(
  input: Pick<HTMLInputElement, "ownerDocument" | "dispatchEvent"> & {
    blur?: () => void;
  }
): void {
  const ownerWindow = input.ownerDocument?.defaultView;
  const KeyboardEventCtor =
    ownerWindow?.KeyboardEvent ??
    (typeof KeyboardEvent !== "undefined" ? KeyboardEvent : undefined);

  if (KeyboardEventCtor) {
    input.dispatchEvent(
      new KeyboardEventCtor("keydown", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        composed: true
      })
    );
    input.dispatchEvent(
      new KeyboardEventCtor("keyup", {
        key: "Escape",
        code: "Escape",
        bubbles: true,
        composed: true
      })
    );
  }

  input.blur?.();
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const valueSetter = resolveInputValueSetter(input);
  const ownerWindow = input.ownerDocument?.defaultView;

  if (valueSetter) {
    valueSetter(value);
  } else {
    input.value = value;
  }

  const InputEventCtor = ownerWindow?.Event ?? Event;
  input.dispatchEvent(new InputEventCtor("input", { bubbles: true }));
  input.dispatchEvent(new InputEventCtor("change", { bubbles: true }));
}

function dismissExternalProviderAutocomplete(): void {
  const input = findExternalProviderInput();

  if (input) {
    dismissExternalProviderAutocompleteInput(input);
  }
}

export async function populateExternalProviderEditorInput(
  searchText: string
): Promise<boolean> {
  const inputText = searchText.trim();

  if (!inputText) {
    return false;
  }

  const addButton = findExternalProviderAddButton();

  if (addButton) {
    addButton.focus();
    addButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  }

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const input = findExternalProviderInput();

    if (input) {
      input.focus();
      setInputValue(input, inputText);
      logger.info(
        `Filled external provider editor input with suggestion "${inputText}"`
      );
      return true;
    }

    await wait(150);
  }

  logger.warn("Could not find external provider editor input");
  return false;
}

function parseMenuItemText(menuItem: Element): string[] {
  return (menuItem.textContent ?? "")
    .split(/\r?\n+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0);
}

function buildCandidateId(name: string, address: string | undefined, index: number): string {
  const base = `${name}|${address ?? ""}|${index}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base.length > 0 ? `editor-${base}` : `editor-${index}`;
}

function readExternalProviderEditorMenuCandidatesFromAutocomplete(
  autocomplete: Element
): ExternalProviderMenuCandidate[] {
  const shadowRoot = (autocomplete as HTMLElement & { shadowRoot?: ShadowRoot }).shadowRoot;

  if (!shadowRoot) {
    return [];
  }

  const menuItems = Array.from(
    shadowRoot.querySelectorAll<HTMLElement>("wz-menu-item")
  );
  const candidates: ExternalProviderMenuCandidate[] = [];

  for (let index = 0; index < menuItems.length; index += 1) {
    const menuItem = menuItems[index];
    const lines = parseMenuItemText(menuItem);

    if (lines.length === 0) {
      continue;
    }

    const name = lines[0];

    if (/^no results$/i.test(name) || /^geen resultaten$/i.test(name)) {
      continue;
    }

    const address = lines.slice(1).join(" | ") || undefined;
    const rawId =
      menuItem.getAttribute("value") ??
      menuItem.getAttribute("data-value") ??
      menuItem.getAttribute("id");

    candidates.push({
      element: menuItem,
      providerId:
        typeof rawId === "string" && rawId.trim().length > 0
          ? rawId.trim()
          : buildCandidateId(name, address, index),
      name,
      address,
      sortIndex: index
    });
  }

  return candidates;
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  return value ? normalizeText(value) : undefined;
}

function addressLooksEquivalent(
  leftAddress: string | undefined,
  rightAddress: string | undefined
): boolean {
  const normalizedLeft = normalizeOptionalText(leftAddress);
  const normalizedRight = normalizeOptionalText(rightAddress);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return (
    normalizedLeft === normalizedRight ||
    normalizedLeft.includes(normalizedRight) ||
    normalizedRight.includes(normalizedLeft)
  );
}

export function chooseExternalProviderEditorCandidate(
  candidates: ExternalProviderEditorCandidate[],
  target: {
    providerId?: string;
    name?: string;
    address?: string;
  }
): ExternalProviderEditorCandidate | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const trimmedProviderId =
    typeof target.providerId === "string" ? target.providerId.trim() : "";
  const normalizedName = normalizeOptionalText(target.name);
  const normalizedAddress = normalizeOptionalText(target.address);

  if (trimmedProviderId) {
    const idMatch = candidates.find(
      (candidate) => candidate.providerId === trimmedProviderId
    );

    if (idMatch) {
      return idMatch;
    }
  }

  if (normalizedName && normalizedAddress) {
    const exactNameAndAddressMatch = candidates.find((candidate) => {
      return (
        normalizeOptionalText(candidate.name) === normalizedName &&
        addressLooksEquivalent(candidate.address, target.address)
      );
    });

    if (exactNameAndAddressMatch) {
      return exactNameAndAddressMatch;
    }
  }

  if (normalizedName) {
    const exactNameMatches = candidates.filter(
      (candidate) => normalizeOptionalText(candidate.name) === normalizedName
    );

    if (exactNameMatches.length === 1) {
      return exactNameMatches[0];
    }

    if (exactNameMatches.length > 1 && normalizedAddress) {
      const addressMatch = exactNameMatches.find((candidate) =>
        addressLooksEquivalent(candidate.address, target.address)
      );

      if (addressMatch) {
        return addressMatch;
      }
    }
  }

  if (candidates.length === 1) {
    const [onlyCandidate] = candidates;
    const normalizedCandidateName = normalizeOptionalText(onlyCandidate.name);

    if (
      !normalizedName ||
      normalizedCandidateName === normalizedName ||
      normalizedCandidateName?.includes(normalizedName) ||
      normalizedName.includes(normalizedCandidateName ?? "")
    ) {
      return onlyCandidate;
    }
  }

  return undefined;
}

function triggerMenuItemSelection(menuItem: HTMLElement): void {
  menuItem.scrollIntoView({ block: "nearest" });
  menuItem.dispatchEvent(
    new MouseEvent("mousedown", { bubbles: true, composed: true })
  );
  menuItem.dispatchEvent(
    new MouseEvent("mouseup", { bubbles: true, composed: true })
  );
  menuItem.dispatchEvent(
    new MouseEvent("click", { bubbles: true, composed: true })
  );
}

export async function applyExternalProviderProposalInEditor(
  proposal: PlaceProposal
): Promise<boolean> {
  const searchText = proposal.externalProviderSearchText?.trim();

  if (!searchText) {
    logger.warn("External provider proposal is missing search text");
    return false;
  }

  const isInputReady = await populateExternalProviderEditorInput(searchText);

  if (!isInputReady) {
    return false;
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const autocomplete = findExternalProviderAutocomplete();

    if (!autocomplete) {
      await wait(150);
      continue;
    }

    const candidates = readExternalProviderEditorMenuCandidatesFromAutocomplete(
      autocomplete
    );

    const selectedCandidate = chooseExternalProviderEditorCandidate(candidates, {
      providerId: proposal.externalProviderTargetId,
      name: proposal.externalProviderTargetName,
      address: proposal.externalProviderTargetAddress
    });

    if (!selectedCandidate) {
      await wait(150);
      continue;
    }

    triggerMenuItemSelection(
      (selectedCandidate as ExternalProviderMenuCandidate).element
    );
    logger.info(
      `Selected external provider "${selectedCandidate.name}" from editor autocomplete`
    );
    return true;
  }

  logger.warn("Could not select a matching external provider autocomplete candidate");
  dismissExternalProviderAutocomplete();
  return false;
}

export async function findExternalProviderEditorCandidates(
  searchText: string
): Promise<ExternalProviderEditorCandidate[]> {
  const isInputReady = await populateExternalProviderEditorInput(searchText);

  if (!isInputReady) {
    return [];
  }

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const autocomplete = findExternalProviderAutocomplete();

    if (!autocomplete) {
      await wait(150);
      continue;
    }

    const candidates = readExternalProviderEditorMenuCandidatesFromAutocomplete(
      autocomplete
    );

    if (candidates.length > 0) {
      logger.info(
        `Read ${candidates.length} external provider autocomplete candidate(s)`
      );
      dismissExternalProviderAutocomplete();
      return candidates;
    }

    await wait(150);
  }

  logger.info("No external provider autocomplete candidates became available");
  dismissExternalProviderAutocomplete();
  return [];
}
