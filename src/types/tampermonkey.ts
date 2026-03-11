declare function GM_xmlhttpRequest(details: {
  method: "GET" | "POST";
  url: string;
  headers?: Record<string, string>;
  data?: string;
  onload?: (response: {
    status: number;
    responseText: string;
  }) => void;
  onerror?: (error: unknown) => void;
}): void;

declare const unsafeWindow: Window & {
  SDK_INITIALIZED?: Promise<void>;
  getWmeSdk?: (options: {
    scriptId: string;
    scriptName: string;
    version?: string;
  }) => any;
};