"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";

/**
 * Theme policy:
 *   • The APP (console, auth, admin) defaults to the dark ink theme; light stays
 *     available through the toggle and the choice persists.
 *   • The MARKETING site and public docs are always dark: the illustration and the
 *     product windows are drawn for it, whatever the visitor picked inside the app.
 *
 * Mechanism: next-themes 0.4.6 ignores nested providers, so the policy lives on the
 * ONE root provider as `forcedTheme`, derived from the pathname. `attribute="class"`
 * toggles `.dark` on <html>, which the token layer in globals.css keys off — so
 * portals (dialogs, menus, ⌘K, toasts) follow the theme too.
 *
 * NOTE `resolvedTheme` does not reflect `forcedTheme` in this version — read the
 * effective theme through `useAppTheme()` below, never `useTheme().resolvedTheme`.
 */

const MARKETING_PATHS = ["/", "/pricing", "/contact", "/platform"];
const MARKETING_PREFIXES = ["/agents", "/docs"];

export function isMarketingPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return (
    MARKETING_PATHS.includes(pathname) ||
    MARKETING_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  );
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  const pathname = usePathname();
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      forcedTheme={isMarketingPath(pathname) ? "dark" : undefined}
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}

const noopSubscribe = () => () => {};

/** True after hydration — the stored theme is only knowable on the client. */
export function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/**
 * The theme actually painted on screen. `forced` is true on marketing routes,
 * where the toggle has no effect and should not be offered.
 */
export function useAppTheme(): {
  theme: "light" | "dark" | undefined;
  forced: boolean;
  setTheme: (theme: string) => void;
} {
  const { forcedTheme, resolvedTheme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const effective = (forcedTheme ?? resolvedTheme) as "light" | "dark" | undefined;
  return { theme: hydrated ? effective : undefined, forced: !!forcedTheme, setTheme };
}
