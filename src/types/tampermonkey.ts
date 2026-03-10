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