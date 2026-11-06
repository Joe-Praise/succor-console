"use client";

import { MoonIcon, SunIcon } from "lucide-react";

import { useAppTheme } from "@/providers/theme-provider";
import { Button } from "@/components/ui/button";

/**
 * Light/dark toggle for the app. Renders nothing on routes whose theme is forced
 * (marketing is always dark), and keeps SSR + first client render identical
 * (theme is unknown until hydration) to avoid a mismatch.
 */
export function ThemeToggle() {
  const { theme, forced, setTheme } = useAppTheme();
  if (forced) return null;

  const isDark = theme === "dark";
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
