export interface WmeContext {
  isReady: boolean;
}

export function getWmeContext(): WmeContext {
  return {
    isReady: typeof window !== "undefined"
  };
}