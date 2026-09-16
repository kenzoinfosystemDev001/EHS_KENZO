export const APP_CONSTANTS = {
  APP_NAME: "Kenzo EHS",
  COMPANY_NAME: "Kenzo Infosystems Pvt Ltd",
  API_VERSION_PREFIX: "/api/v1",
  DEFAULT_PAGINATION_LIMIT: 20,
  MAX_PAGINATION_LIMIT: 100,
  AUTH: {
    ACCESS_TOKEN_COOKIE: "kenzo_access_token",
    REFRESH_TOKEN_COOKIE: "kenzo_refresh_token",
    DEFAULT_ACCESS_EXPIRY_SECONDS: 15 * 60, // 15 mins
    DEFAULT_REFRESH_EXPIRY_SECONDS: 7 * 24 * 60 * 60, // 7 days
  },
  AUDIT: {
    SYSTEM_ACTOR_ID: "00000000-0000-0000-0000-000000000000",
  },
} as const;
