import type { Metadata, Viewport } from "next";
import { Fredoka, Nunito, Caveat } from "next/font/google";
import "./globals.css";
import { AmbientAudioProvider } from "@/components/sound/AmbientAudioProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { MotionConfig } from "framer-motion";
import { Analytics } from "@vercel/analytics/next";
import { MergeClient } from "@/components/MergeClient";
import { FriendLive } from "@/components/social/FriendLive";
import { ButterflySky } from "@/components/ambient/ButterflySky";
import { Toaster } from "@/components/ui/Toast";
import { TabBar } from "@/components/nav/TabBar";
import { GameBar } from "@/components/nav/GameBar";
import { SignatureFooter } from "@/components/footer/SignatureFooter";
import { SITE_URL, SITE_DESCRIPTION } from "@/lib/site";

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
  // Absolute URLs for canonicals, Open Graph and the sitemap.
  metadataBase: new URL(SITE_URL),
  title: {
    default: "NhakoSearch: Free Cozy Word Search Game for Two",
    template: "%s | NhakoSearch",
  },
  description: SITE_DESCRIPTION,
  keywords: [
    "word search",
    "word search game",
    "multiplayer word search",
    "word search with friends",
    "daily word search",
    "free word puzzle",
    "cozy game",
    "online word game",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "NhakoSearch",
    title: "NhakoSearch: Free Cozy Word Search Game for Two",
    description: SITE_DESCRIPTION,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NhakoSearch: Free Cozy Word Search Game for Two",
    description: SITE_DESCRIPTION,
  },
  category: "games",
  formatDetection: { telephone: false, email: false, address: false },
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
    // Pixel art from scripts/logo-art.mjs (npm run icons). The SVG is the
    // pixel grid itself, so it stays sharp at any tab size.
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 64x64" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32.png", sizes: "32x32", type: "image/png" },
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
    { media: "(prefers-color-scheme: dark)", color: "#140E2C" },
  ],
  width: "device-width",
  initialScale: 1,
  // Zoom stays available (accessibility); the board itself sets touch-none.
  maximumScale: 5,
  // Draw edge to edge on notched phones; the chrome pads itself with
  // env(safe-area-inset-*) instead of leaving white bars.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      // The pre-paint script below adds `dark` before hydration; that is the
      // point of it, not a mismatch.
      suppressHydrationWarning
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
        <FriendLive />
        <MotionConfig reducedMotion="user">
          <AmbientAudioProvider>
            <ButterflySky />
            <GameBar />
            <main className="app-shell flex flex-col flex-1 relative">
              {children}
            </main>
            <SignatureFooter />
            <TabBar />
            <Toaster />
          </AmbientAudioProvider>
        </MotionConfig>
        {/* Vercel Web Analytics. Loads /_vercel/insights/script.js (same
            origin, so the CSP needs no change). That path only exists on
            Vercel, so the component is rendered only in Vercel builds
            (VERCEL=1); elsewhere the script 404s and logs a console error. */}
        {process.env.VERCEL && <Analytics />}
      </body>
    </html>
  );
}
