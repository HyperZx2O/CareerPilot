import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";

// ─── Fonts ────────────────────────────────────────────────────────────────────

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

// ─── Metadata ─────────────────────────────────────────────────────────────────

export const metadata: Metadata = {
  title: {
    default: "CareerPilot — Your AI Career Co-pilot",
    template: "%s | CareerPilot",
  },
  description:
    "CareerPilot is an AI-first career operating system that hunts jobs, scores fit, drafts applications, and identifies skill gaps — all grounded in your own CV.",
  keywords: [
    "career",
    "AI",
    "job search",
    "CV",
    "resume",
    "job hunting",
    "career guidance",
  ],
  openGraph: {
    title: "CareerPilot — Your AI Career Co-pilot",
    description:
      "Hunt jobs, score fit, and get AI career guidance grounded in your CV.",
    type: "website",
  },
};

// ─── Root Layout ──────────────────────────────────────────────────────────────

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        {children}

        {/* Global toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              borderRadius: "10px",
              background: "#1e1b4b",
              color: "#f8fafc",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#16a34a", secondary: "#f8fafc" },
            },
            error: {
              iconTheme: { primary: "#dc2626", secondary: "#f8fafc" },
            },
          }}
        />
      </body>
    </html>
  );
}
