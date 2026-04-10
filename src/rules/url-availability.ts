import type { PlaceIssue } from "../types/issue.ts";
import { t } from "../i18n/runtime.ts";

const URL_AVAILABILITY_CACHE_TTL_MS = 10 * 60 * 1000;
const URL_AVAILABILITY_TIMEOUT_MS = 5000;

type UrlAvailabilityStatus =
  | "reachable"
  | "http-error"
  | "network-error"
  | "timeout";

type UrlAvailabilityResult = {
  checkedAt: number;
  status: UrlAvailabilityStatus;
  httpStatus?: number;
};

type UrlAvailabilityRequester = (params: {
  url: string;
  onload: (response: { status: number }) => void;
  onerror: () => void;
}) => void;

const availabilityCache = new Map<string, UrlAvailabilityResult>();

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeUrl(url: string): string {
  return url.trim();
}

function isHttpSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

function readCachedResult(url: string): UrlAvailabilityResult | undefined {
  const cached = availabilityCache.get(url);

  if (!cached) {
    return undefined;
  }

  if (Date.now() - cached.checkedAt > URL_AVAILABILITY_CACHE_TTL_MS) {
    availabilityCache.delete(url);
    return undefined;
  }

  return cached;
}

function cacheResult(url: string, result: Omit<UrlAvailabilityResult, "checkedAt">): UrlAvailabilityResult {
  const cachedResult: UrlAvailabilityResult = {
    ...result,
    checkedAt: Date.now()
  };

  availabilityCache.set(url, cachedResult);
  return cachedResult;
}

function getDefaultRequester(): UrlAvailabilityRequester {
  return ({ url, onload, onerror }) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      onload: (response) => {
        onload({ status: response.status });
      },
      onerror: () => {
        onerror();
      }
    });
  };
}

function requestUrlAvailability(
  url: string,
  requester: UrlAvailabilityRequester
): Promise<UrlAvailabilityResult> {
  return new Promise((resolve) => {
    let settled = false;

    const finish = (result: Omit<UrlAvailabilityResult, "checkedAt">): void => {
      if (settled) {
        return;
      }

      settled = true;
      resolve(cacheResult(url, result));
    };

    const timeoutId = globalThis.setTimeout(() => {
      finish({ status: "timeout" });
    }, URL_AVAILABILITY_TIMEOUT_MS);

    requester({
      url,
      onload: (response) => {
        globalThis.clearTimeout(timeoutId);

        finish(
          isHttpSuccessStatus(response.status)
            ? {
                status: "reachable",
                httpStatus: response.status
              }
            : {
                status: "http-error",
                httpStatus: response.status
              }
        );
      },
      onerror: () => {
        globalThis.clearTimeout(timeoutId);
        finish({ status: "network-error" });
      }
    });
  });
}

export async function validateUrlAvailability(
  url: string,
  requester: UrlAvailabilityRequester = getDefaultRequester()
): Promise<PlaceIssue | undefined> {
  if (!hasText(url)) {
    return undefined;
  }

  const normalizedUrl = normalizeUrl(url);
  const cached = readCachedResult(normalizedUrl);
  const result = cached ?? (await requestUrlAvailability(normalizedUrl, requester));

  if (result.status === "reachable") {
    return undefined;
  }

  let message = t("issue.url.availability.invalid");

  if (result.status === "http-error" && typeof result.httpStatus === "number") {
    message = t("issue.url.availability.httpStatus", {
      status: String(result.httpStatus)
    });
  } else if (result.status === "timeout") {
    message = t("issue.url.availability.timeout");
  } else if (result.status === "network-error") {
    message = t("issue.url.availability.network");
  }

  return {
    field: "url",
    severity: "warning",
    message,
    currentValue: normalizedUrl,
    expectedValue: "reachable",
    ruleId: "urlValidation.availability"
  };
}

export function resetUrlAvailabilityCache(): void {
  availabilityCache.clear();
}
