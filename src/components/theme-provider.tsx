"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";

/** Light / dark / system, stored per browser. The class lands on <html>. */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  );
}
