import type { Metadata } from "next";
import localFont from "next/font/local";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { ourFileRouter } from "@/app/api/uploadthing/core";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const bnCringeSerif = localFont({
  src: [
    {
      path: "../../public/fonts/bn-cringe-serif/BNCringeSerifLight.woff2",
      weight: "300",
      style: "normal",
    },
    {
      path: "../../public/fonts/bn-cringe-serif/BNCringeSerifRegular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/bn-cringe-serif/BNCringeSerifMedium.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-cringe-serif",
  display: "swap",
});

const neueMontreal = localFont({
  src: [
    {
      path: "../../public/fonts/neue-montreal/NeueMontreal-Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/neue-montreal/NeueMontreal-Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../../public/fonts/neue-montreal/NeueMontreal-Bold.otf",
      weight: "700",
      style: "normal",
    },
  ],
  variable: "--font-neue-montreal",
  display: "swap",
});

const canela = localFont({
  src: [
    {
      path: "../../public/fonts/canela/Canela-Regular-Trial.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../../public/fonts/canela/Canela-Medium-Trial.otf",
      weight: "500",
      style: "normal",
    },
  ],
  variable: "--font-canela",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Pragya Yog School — PYS Portal",
    template: "%s · Pragya Yog School",
  },
  description:
    "Pragya Yog School Central Hong Kong — Staff, Teacher Training & Accountability Portal.",
  icons: {
    icon: "/logo.svg",
    apple: "/logo.png",
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
      className={`${neueMontreal.variable} ${bnCringeSerif.variable} ${canela.variable} ${jakarta.variable}`}
      suppressHydrationWarning
    >
      <body
        className={`${neueMontreal.variable} ${bnCringeSerif.variable} ${canela.variable} ${jakarta.variable} font-sans antialiased`}
      >
        <NextSSRPlugin
          routerConfig={extractRouterConfig(ourFileRouter)}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
