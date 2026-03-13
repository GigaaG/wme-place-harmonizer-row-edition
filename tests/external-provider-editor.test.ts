import assert from "node:assert/strict";

import {
  chooseExternalProviderEditorCandidate,
  resolveInputValueSetter
} from "../src/integration/sdk/external-provider-editor.ts";

function runTest(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("prefers an exact provider id match in editor candidates", () => {
  const candidate = chooseExternalProviderEditorCandidate(
    [
      {
        providerId: "provider-1",
        name: "Albert Heijn",
        address: "Damrak 1",
        sortIndex: 0
      },
      {
        providerId: "provider-2",
        name: "Albert Heijn",
        address: "Damrak 2",
        sortIndex: 1
      }
    ],
    {
      providerId: "provider-2",
      name: "Albert Heijn",
      address: "Damrak 2"
    }
  );

  assert.equal(candidate?.providerId, "provider-2");
});

runTest("falls back to exact name and address matching when ids differ", () => {
  const candidate = chooseExternalProviderEditorCandidate(
    [
      {
        providerId: "editor-a",
        name: "Albert Heijn",
        address: "Damrak 1, Amsterdam",
        sortIndex: 0
      },
      {
        providerId: "editor-b",
        name: "Albert Heijn To Go",
        address: "Damrak 1, Amsterdam",
        sortIndex: 1
      }
    ],
    {
      providerId: "google-place-id",
      name: "Albert Heijn",
      address: "Damrak 1"
    }
  );

  assert.equal(candidate?.providerId, "editor-a");
});

runTest("does not guess when multiple editor candidates remain ambiguous", () => {
  const candidate = chooseExternalProviderEditorCandidate(
    [
      {
        providerId: "editor-a",
        name: "Shell",
        address: "Main Street 1",
        sortIndex: 0
      },
      {
        providerId: "editor-b",
        name: "Shell",
        address: "Main Street 2",
        sortIndex: 1
      }
    ],
    {
      name: "Shell"
    }
  );

  assert.equal(candidate, undefined);
});

runTest("resolves the input value setter from the input owner window realm", () => {
  let assignedValue = "";
  const ownerWindowPrototype = {};

  Object.defineProperty(ownerWindowPrototype, "value", {
    set(value: string) {
      assignedValue = `owner:${value}`;
    }
  });

  const fakeInput = {
    ownerDocument: {
      defaultView: {
        HTMLInputElement: {
          prototype: ownerWindowPrototype
        }
      }
    }
  };

  const setter = resolveInputValueSetter(fakeInput);

  assert.ok(setter);
  setter?.("Albert Heijn");
  assert.equal(assignedValue, "owner:Albert Heijn");
});
