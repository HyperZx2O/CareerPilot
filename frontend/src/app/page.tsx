import type { Metadata } from "next";
import LandingPageClient from "@/components/landing/LandingPageClient";

export const metadata: Metadata = {
  title: "CareerPilot — Your AI Career Co-pilot",
  description:
    "Hunt jobs, score fit, and get AI career guidance grounded in your CV. The AI-first career operating system built for ambitious job seekers.",
};

export default function LandingPage() {
  return <LandingPageClient />;
}
