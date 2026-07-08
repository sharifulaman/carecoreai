import { createContext, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext({
  theme: "light",
  setTheme: () => {},
  toggleTheme: () => {},
  isDark: false,
  compactMode: false,
  setCompactMode: () => {},
  toggleCompactMode: () => {},
});

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    if (typeof window === "undefined") {
      return "light";
    }

    const storedTheme = localStorage.getItem("carecore-theme");
    if (storedTheme === "light" || storedTheme === "dark") {
      return storedTheme;
    }

    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  const [compactMode, setCompactMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    return localStorage.getItem("carecore-compact-mode") === "true";
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("compact", compactMode);
    localStorage.setItem("carecore-theme", theme);
    localStorage.setItem("carecore-compact-mode", compactMode ? "true" : "false");
  }, [theme, compactMode]);

  const toggleTheme = () => setTheme((current) => (current === "dark" ? "light" : "dark"));
  const toggleCompactMode = () => setCompactMode((current) => !current);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme, isDark: theme === "dark", compactMode, setCompactMode, toggleCompactMode }),
    [theme, compactMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
