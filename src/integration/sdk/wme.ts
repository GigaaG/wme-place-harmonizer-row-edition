import { logger } from "../../logging/logger";

export interface WmeContext {
  isReady: boolean;
  hasWindow: boolean;
  hasDocument: boolean;
  hasSdk: boolean;
}

const SCRIPT_ID = "wme-place-harmonizer-row-edition";
const SCRIPT_NAME = "WME Place Harmonizer ROW Edition";

function getSdkHostWindow(): Window & {
  SDK_INITIALIZED?: Promise<void>;
  getWmeSdk?: (options: {
    scriptId: string;
    scriptName: string;
    version?: string;
  }) => any;
} {
  try {
    if (typeof unsafeWindow !== "undefined") {
      return unsafeWindow;
    }
  } catch {
    // ignore
  }

  return window as Window & {
    SDK_INITIALIZED?: Promise<void>;
    getWmeSdk?: (options: {
      scriptId: string;
      scriptName: string;
      version?: string;
    }) => any;
  };
}

export function getWmeSdk(): any | null {
  const hostWindow = getSdkHostWindow();

  if (typeof hostWindow.getWmeSdk !== "function") {
    return null;
  }

  try {
    return hostWindow.getWmeSdk({
      scriptId: SCRIPT_ID,
      scriptName: SCRIPT_NAME
    });
  } catch {
    return null;
  }
}

export function getWmeContext(): WmeContext {
  const sdk = getWmeSdk();

  return {
    isReady:
      typeof window !== "undefined" &&
      typeof document !== "undefined" &&
      !!sdk,
    hasWindow: typeof window !== "undefined",
    hasDocument: typeof document !== "undefined",
    hasSdk: !!sdk
  };
}

export async function waitForWmeSdkReady(timeoutMs = 20000): Promise<any> {
  const hostWindow = getSdkHostWindow();

  if (typeof document === "undefined") {
    throw new Error("Document is not available");
  }

  if (document.readyState === "loading") {
    logger.info("Waiting for DOMContentLoaded before checking SDK");
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  if (!hostWindow.SDK_INITIALIZED) {
    throw new Error("SDK_INITIALIZED is not available on host window");
  }

  logger.info("Waiting for WME SDK initialization");

  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(new Error("Timed out waiting for WME SDK initialization"));
    }, timeoutMs);
  });

  await Promise.race([hostWindow.SDK_INITIALIZED, timeoutPromise]);

  const sdk = getWmeSdk();

  if (!sdk) {
    throw new Error("WME SDK initialized, but getWmeSdk() returned no SDK instance");
  }

  logger.info("WME SDK detected via SDK_INITIALIZED/getWmeSdk");

  return sdk;
}