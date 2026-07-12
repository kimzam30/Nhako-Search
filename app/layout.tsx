import type { Metadata } from "next";
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
  appleWebApp: {
    title: "NhakoSearch",
    statusBarStyle: "default",
  },
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
      <body className="min-h-screen flex flex-col font-body pb-24 md:pb-0 md:pl-24 lg:pl-0 bg-background text-ink">
        <PwaRegister />
        <MergeClient />
        <MotionConfig reducedMotion="user">
          <AmbientAudioProvider>
            <div className="flex flex-col flex-1 w-full md:max-w-[800px] md:mx-auto lg:max-w-[1000px] lg:mx-auto relative">
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
