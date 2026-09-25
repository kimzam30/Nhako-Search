import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Caveat } from "next/font/google";
import "./globals.css";
import { AmbientAudioProvider } from "@/components/sound/AmbientAudioProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { MotionConfig } from "framer-motion";
import { MergeClient } from "@/components/MergeClient";

const fredoka = Fredoka({
  variable: "--font-fredoka",
  subsets: ["latin"],
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NhakoSearch",
  description: "A cozy, hand-drawn word-search game.",
  manifest: "/manifest.json",
  applicationName: "NhakoSearch",
  appleWebApp: {
    capable: true,
    title: "NhakoSearch",
    statusBarStyle: "default",
  },
  icons: {
    // Smallest first: browsers pick the closest match for the tab, so listing
    // only 192/512 made them downscale a large image on every page load.
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: [{ url: "/favicon.ico" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFF6F8" },
    { media: "(prefers-color-scheme: dark)", color: "#241326" },
  ],
  width: "device-width",
  initialScale: 1,
  // Zoom stays available (accessibility); the board itself sets touch-none.
  maximumScale: 5,
  // Draw edge to edge on notched phones; the chrome pads itself with
  // env(safe-area-inset-*) instead of leaving white bars.
  viewportFit: "cover",
};

import { TabBar } from "@/components/nav/TabBar";
import { GameBar } from "@/components/nav/GameBar";
import { SignatureFooter } from "@/components/footer/SignatureFooter";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${fredoka.variable} ${nunito.variable} ${caveat.variable} antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var theme = localStorage.getItem('nhako_theme') || 'system';
                var isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
                if (isDark) document.documentElement.classList.add('dark');
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-dvh flex flex-col font-body bg-background text-ink">
        <PwaRegister />
        <MergeClient />
        <MotionConfig reducedMotion="user">
          <AmbientAudioProvider>
            <GameBar />
            <main className="app-shell flex flex-col flex-1 relative">
              {children}
            </main>
            <SignatureFooter />
            <TabBar />
          </AmbientAudioProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
