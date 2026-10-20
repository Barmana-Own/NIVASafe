import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { persistAppTheme, readAppTheme, type AppTheme } from "./theme";

type Appearance = { theme: AppTheme; changeTheme: (theme: AppTheme) => void };
const AppearanceContext = createContext<Appearance | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>(() => readAppTheme());
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "blue" ? "dark" : "light";
  }, [theme]);
  function changeTheme(next: AppTheme) { setTheme(next); persistAppTheme(next); }
  return <AppearanceContext.Provider value={{ theme, changeTheme }}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const appearance = useContext(AppearanceContext);
  if (!appearance) throw new Error("AppearanceProvider is required");
  return appearance;
}
