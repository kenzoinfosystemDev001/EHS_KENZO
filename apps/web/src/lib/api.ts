export function getApiBaseUrl(): string {
  let url = process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      url = "https://ehs-kenzo.onrender.com/api/v1";
    } else {
      url = "http://localhost:4000/api/v1";
    }
  }

  // Remove trailing slashes
  url = url.replace(/\/+$/, "");

  // If provided URL doesn't end with /api/v1, append it
  if (!url.endsWith("/api/v1")) {
    url = `${url}/api/v1`;
  }

  return url;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  meta?: {
    requestId?: string;
    total?: number;
    page?: number;
    pageSize?: number;
    [key: string]: unknown;
  };
  error?: {
    code: string;
    message: string;
    details?: unknown[];
  };
}

// Token is injected by the auth context at runtime
let _accessToken: string | null = null;
let _onUnauthorized: (() => Promise<string | null>) | null = null;

export function setApiToken(token: string | null) {
  _accessToken = token;
}

export function setRefreshHandler(handler: () => Promise<string | null>) {
  _onUnauthorized = handler;
}

export async function apiClient<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const doRequest = async (token: string | null) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }
    if (token && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    const baseUrl = getApiBaseUrl();
    return fetch(
      `${baseUrl}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`,
      { ...options, headers, credentials: "include" },
    );
  };

  let res = await doRequest(_accessToken);

  // Auto-refresh on 401
  if (res.status === 401 && _onUnauthorized) {
    const newToken = await _onUnauthorized();
    if (newToken) {
      _accessToken = newToken;
      res = await doRequest(newToken);
    }
  }

  const data = await res.json();
  return data as ApiResponse<T>;
}
