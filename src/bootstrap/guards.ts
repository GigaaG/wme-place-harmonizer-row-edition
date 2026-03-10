export function hasWindowObject(): boolean {
  return typeof window !== "undefined";
}

export function hasDocumentObject(): boolean {
  return typeof document !== "undefined";
}

export function isSupportedEnvironment(): boolean {
  return hasWindowObject() && hasDocumentObject();
}