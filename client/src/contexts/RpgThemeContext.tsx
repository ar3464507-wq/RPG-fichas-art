import React, { createContext, useContext, useEffect, useState } from "react";

export type RpgTheme = "classic" | "medieval" | "terror" | "investigation";

export const RPG_THEMES: { value: RpgTheme; label: string; description: string; color: string }[] = [
  {
    value: "classic",
    label: "Clássico",
    description: "Dark fantasy com tons dourados",
    color: "oklch(0.65 0.18 45)",
  },
  {
    value: "medieval",
    label: "Medieval",
    description: "Pergaminhos e pedra antiga",
    color: "oklch(0.7 0.16 55)",
  },
  {
    value: "terror",
    label: "Terror",
    description: "Sombrio e perturbador",
    color: "oklch(0.55 0.22 25)",
  },
  {
    value: "investigation",
    label: "Investigação",
    description: "Noir e misterioso",
    color: "oklch(0.62 0.16 220)",
  },
];

interface RpgThemeContextValue {
  theme: RpgTheme;
  setTheme: (theme: RpgTheme) => void;
}

const RpgThemeContext = createContext<RpgThemeContextValue>({
  theme: "classic",
  setTheme: () => {},
});

export function RpgThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<RpgTheme>(() => {
    return (localStorage.getItem("rpg-theme") as RpgTheme) ?? "classic";
  });

  const setTheme = (t: RpgTheme) => {
    setThemeState(t);
    localStorage.setItem("rpg-theme", t);
  };

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <RpgThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </RpgThemeContext.Provider>
  );
}

export function useRpgTheme() {
  return useContext(RpgThemeContext);
}
