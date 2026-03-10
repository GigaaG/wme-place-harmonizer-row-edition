export interface WmeContext {
  isReady: boolean;
  hasWindow: boolean;
  hasDocument: boolean;
}

export function getWmeContext(): WmeContext {
  return {
    isReady: typeof window !== "undefined" && typeof document !== "undefined",
    hasWindow: typeof window !== "undefined",
    hasDocument: typeof document !== "undefined"
  };
}