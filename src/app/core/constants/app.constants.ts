export const APP_CONFIG = {
  APP_NAME: 'Fluid Pack',
  VERSION: '1.0.0',
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  TOKEN_REFRESH_THRESHOLD: 5 * 60 * 1000, // 5 minutes before expiry
} as const;

export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'accessToken',
  REFRESH_TOKEN: 'refreshToken',
  USER_DATA: 'userData',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;
