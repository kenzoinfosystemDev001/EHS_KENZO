"use client";

import { useEffect } from "react";
import { useAuth } from "./auth-context";
import { setApiToken, setRefreshHandler } from "./api";

export function ApiTokenSync() {
  const { accessToken, refreshAccessToken } = useAuth();

  useEffect(() => {
    setApiToken(accessToken);
  }, [accessToken]);

  useEffect(() => {
    setRefreshHandler(refreshAccessToken);
  }, [refreshAccessToken]);

  return null;
}
