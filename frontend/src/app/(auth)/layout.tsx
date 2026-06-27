import { Target } from "lucide-react";
import Link from "next/link";
import Providers from "../providers";

/* Hallmark · macrostructure: Letter · tone: technical · theme: Cobalt
 * Nav: none (auth-only) · Footer: none
 * Enrichment: none — typography only
 */

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
            <Target className="h-4 w-4 text-white" strokeWidth={2.5} />
          </div>
          <span
            className="text-lg font-semibold text-slate-100"
            style={{ fontFamily: "var(--font-display)" }}
          >
            CareerPilot
          </span>
        </Link>
        <div className="w-full max-w-md">{children}</div>
      </div>
    </Providers>
  );
}
