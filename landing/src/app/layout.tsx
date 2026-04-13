import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Orchestra — Your Dev Stack, Under Control",
  description:
    "The intelligent control center for every developer. Monitor, fix, and optimize your local dev environment with AI-powered agents.",
  openGraph: {
    title: "Orchestra — Your Dev Stack, Under Control",
    description:
      "The intelligent control center for every developer. Monitor, fix, and optimize your local dev environment with AI-powered agents.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable} dark`}>
      <body className="min-h-screen bg-[#09090b] text-white font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
