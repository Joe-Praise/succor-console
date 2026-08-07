"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/**
 * Warm-paper light default (the iconic Claude look), with a fully polished
 * warm-charcoal dark. `attribute="class"` toggles `.dark` on <html>, which the
 * token layer in globals.css keys off.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="light"
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
