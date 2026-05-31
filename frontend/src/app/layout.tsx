import "@/styles/globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "CareerPilot — AI Career OS",
  description:
    "AI-first career operating system. Upload your CV, search jobs with fit scores, get personalized career guidance, and track your progress.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
