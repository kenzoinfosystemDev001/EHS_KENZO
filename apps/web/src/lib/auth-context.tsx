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
        const res = await fetch(`${apiBase}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "" }), // server reads from cookie
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.accessToken) {
            const newToken = data.data.accessToken;
            setAccessToken(newToken);
            return newToken;
          }
        }
      } catch {
        // Refresh failed
      }
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
      setIsLoading(true);
      try {
        const apiBase = getApiBaseUrl();
        // Try to get fresh token via refresh cookie
        const res = await fetch(`${apiBase}/auth/refresh`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: "" }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data.accessToken) {
            const token = data.data.accessToken;
            setAccessToken(token);
            // Fetch user profile
            const meRes = await fetch(`${apiBase}/auth/me`, {
              credentials: "include",
              headers: { Authorization: `Bearer ${token}` },
            });
            if (meRes.ok) {
              const meData = await meRes.json();
              if (meData.success) setUser(meData.data);
            }
          }
        }
      } catch {
        // No active session
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
