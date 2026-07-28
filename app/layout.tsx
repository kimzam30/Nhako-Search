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
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
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
  // The board is a precision drag target; zooming mid-drag misaligns it.
  maximumScale: 5,
};

import { FloatingNav } from "@/components/nav/FloatingNav";
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
      <body className="min-h-screen flex flex-col font-body pb-24 bg-background text-ink">
        <PwaRegister />
        <MergeClient />
        <MotionConfig reducedMotion="user">
          <AmbientAudioProvider>
            <div className="app-shell flex flex-col flex-1 relative">
              {children}
            </div>
            <SignatureFooter />
            <FloatingNav />
          </AmbientAudioProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
