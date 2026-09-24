export type AppTheme = "blue" | "white";

export const APP_THEME_STORAGE_KEY = "nivasafe-theme";
export const DEFAULT_APP_THEME: AppTheme = "blue";

type ThemeStorage = Pick<Storage, "getItem" | "setItem">;

export function isAppTheme(value: unknown): value is AppTheme {
  return value === "blue" || value === "white";
}

function browserStorage(): ThemeStorage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

export function readAppTheme(storage: ThemeStorage | null | undefined = browserStorage()): AppTheme {
  try {
    const stored = storage?.getItem(APP_THEME_STORAGE_KEY);
    return isAppTheme(stored) ? stored : DEFAULT_APP_THEME;
  } catch {
    return DEFAULT_APP_THEME;
  }
}

export function persistAppTheme(theme: AppTheme, storage: ThemeStorage | null | undefined = browserStorage()): void {
  try {
    storage?.setItem(APP_THEME_STORAGE_KEY, theme);
  } catch {
    // A blocked or unavailable browser store must not prevent theme changes.
  }
}
