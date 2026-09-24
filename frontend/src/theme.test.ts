import { describe, expect, it } from "vitest";
import { APP_THEME_STORAGE_KEY, DEFAULT_APP_THEME, persistAppTheme, readAppTheme } from "./theme";

function createStorage(initial?: string) {
  let value = initial ?? null;
  return {
    getItem: (_key: string) => value,
    setItem: (_key: string, next: string) => { value = next; },
  };
}

describe("app theme preference", () => {
  it("defaults safely and accepts only the supported themes", () => {
    expect(readAppTheme(createStorage())).toBe(DEFAULT_APP_THEME);
    expect(readAppTheme(createStorage("blue"))).toBe("blue");
    expect(readAppTheme(createStorage("white"))).toBe("white");
    expect(readAppTheme(createStorage("dark"))).toBe(DEFAULT_APP_THEME);
  });

  it("persists the selected theme under the application preference key", () => {
    const storage = createStorage();
    persistAppTheme("white", storage);
    expect(storage.getItem(APP_THEME_STORAGE_KEY)).toBe("white");
    expect(readAppTheme(storage)).toBe("white");
  });
});
