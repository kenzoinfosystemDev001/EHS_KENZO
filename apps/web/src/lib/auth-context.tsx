"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";

import { getApiBaseUrl } from "./api";

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  roleScopes: Array<{
    roleCode: string;
    scope: string;
    plantId?: string;
    departmentId?: string;
  }>;
}

interface AuthContextValue {
  user: UserProfile | null;
  accessToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<string | null>;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ACCESS_TOKEN_KEY = "kenzo_access_token";
const REFRESH_TOKEN_KEY = "kenzo_refresh_token";
const USER_KEY = "kenzo_user_profile";

function setClientSessionCookie(active: boolean) {
  if (typeof document === "undefined") return;
  if (active) {
    document.cookie = "kenzo_session=1; path=/; max-age=604800; SameSite=Lax";
  } else {
    document.cookie = "kenzo_session=; path=/; max-age=0; SameSite=Lax";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshingRef = useRef<Promise<string | null> | null>(null);

  const refreshAccessToken = useCallback(async (): Promise<string | null> => {
    if (refreshingRef.current) return refreshingRef.current;

    refreshingRef.current = (async () => {
      try {
        const apiBase = getApiBaseUrl();
        const storedRefreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem(REFRESH_TOKEN_KEY) || ""
            : "";

        const res = await fetch(`${apiBase}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.accessToken) {
            const newToken = data.data.accessToken;
            setAccessToken(newToken);
            if (typeof window !== "undefined") {
              localStorage.setItem(ACCESS_TOKEN_KEY, newToken);
              if (data.data.refreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
              }
            }
            setClientSessionCookie(true);
            return newToken;
          }
        }
      } catch {
        // Refresh failed
      }
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      setClientSessionCookie(false);
      setUser(null);
      setAccessToken(null);
      return null;
    })().finally(() => {
      refreshingRef.current = null;
    });

    return refreshingRef.current;
  }, []);

  useEffect(() => {
    (async () => {
      // 1. Immediately hydrate from localStorage if present
      if (typeof window !== "undefined") {
        try {
          const cachedUser = localStorage.getItem(USER_KEY);
          const cachedToken = localStorage.getItem(ACCESS_TOKEN_KEY);
          if (cachedUser && cachedToken) {
            setUser(JSON.parse(cachedUser));
            setAccessToken(cachedToken);
            setClientSessionCookie(true);
          }
        } catch {
          // Ignore parse errors
        }
      }

      // 2. Validate/refresh session with the backend
      try {
        const apiBase = getApiBaseUrl();
        const storedRefreshToken =
          typeof window !== "undefined"
            ? localStorage.getItem(REFRESH_TOKEN_KEY) || ""
            : "";

        const res = await fetch(`${apiBase}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: storedRefreshToken }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.accessToken) {
            const token = data.data.accessToken;
            setAccessToken(token);
            if (typeof window !== "undefined") {
              localStorage.setItem(ACCESS_TOKEN_KEY, token);
              if (data.data.refreshToken) {
                localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
              }
            }
            setClientSessionCookie(true);

            // Fetch user profile
            const meRes = await fetch(`${apiBase}/auth/me`, {
              credentials: "include",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.success) {
                setUser(meData.data);
                if (typeof window !== "undefined") {
                  localStorage.setItem(USER_KEY, JSON.stringify(meData.data));
                }
              }
            }
          }
        } else if (res.status === 401) {
          // Explicitly expired or invalid session
          if (typeof window !== "undefined") {
            localStorage.removeItem(ACCESS_TOKEN_KEY);
            localStorage.removeItem(REFRESH_TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
          }
          setClientSessionCookie(false);
          setUser(null);
          setAccessToken(null);
        }
      } catch {
        // Offline or network error - keep cached credentials if available
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const apiBase = getApiBaseUrl();
    let res: Response;
    try {
      res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Unable to reach backend API at ${apiBase}. If this is a deployed environment, ensure CORS allows this origin and the backend is awake. (${msg})`,
      );
    }

    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.success) {
      throw new Error(
        data?.message ||
          data?.error?.message ||
          `Authentication failed with status ${res.status}`,
      );
    }
    setAccessToken(data.data.accessToken);
    setUser(data.data.user);

    if (typeof window !== "undefined") {
      localStorage.setItem(ACCESS_TOKEN_KEY, data.data.accessToken);
      if (data.data.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, data.data.refreshToken);
      }
      localStorage.setItem(USER_KEY, JSON.stringify(data.data.user));
    }
    setClientSessionCookie(true);
  }, []);

  const logout = useCallback(async () => {
    try {
      if (accessToken) {
        const apiBase = getApiBaseUrl();
        await fetch(`${apiBase}/auth/logout`, {
          method: "POST",
          credentials: "include",
          headers: { Authorization: `Bearer ${accessToken}` },
        });
      }
    } finally {
      if (typeof window !== "undefined") {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
      setClientSessionCookie(false);
      setUser(null);
      setAccessToken(null);
    }
  }, [accessToken]);

  const hasPermission = useCallback(
    (permission: string) => user?.permissions?.includes(permission) ?? false,
    [user],
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        login,
        logout,
        refreshAccessToken,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
