import type { Metadata } from "next";
import { Fredoka, Nunito, Caveat } from "next/font/google";
import "./globals.css";
import { AmbientAudioProvider } from "@/components/sound/AmbientAudioProvider";
import { PwaRegister } from "@/components/PwaRegister";
import { MotionConfig } from "framer-motion";

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
      <body className="min-h-screen flex flex-col font-body">
        <PwaRegister />
        <MotionConfig reducedMotion="user">
          <AmbientAudioProvider>
            {children}
          </AmbientAudioProvider>
        </MotionConfig>
      </body>
    </html>
  );
}
