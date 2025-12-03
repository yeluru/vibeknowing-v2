"use client";

import { ThemeProvider } from "@/contexts/ThemeContext";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      {children}
      <Toaster position="top-center" />
    </ThemeProvider>
  );
}

