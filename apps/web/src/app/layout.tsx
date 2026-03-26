import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import "./ui.v2.css";
import AppShell from "@/components/layout/AppShell";
import { Providers } from "@/components/providers/Providers";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "VibeKnowing",
  description: "Turn any content into mastery.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body className={`${outfit.variable} font-sans antialiased vk-ui-v2`}>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
