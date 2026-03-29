export function fetchJson<T>(url: string): Promise<T> {
  return new Promise((resolve, reject) => {
    GM_xmlhttpRequest({
      method: "GET",
      url,
      headers: {
        Accept: "application/json"
      },
      onload: (response) => {
        if (response.status < 200 || response.status >= 300) {
          reject(
            new Error(`Request failed with status ${response.status} for ${url}`)
          );
          return;
        }

        try {
          const parsed = JSON.parse(response.responseText) as T;
          resolve(parsed);
        } catch (_error) {
          reject(
            new Error(`Invalid JSON received from ${url}`)
          );
        }
      },
      onerror: (_error) => {
        reject(new Error(`Network error while loading ${url}`));
      }
    });
  });
}
