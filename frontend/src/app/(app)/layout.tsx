import Sidebar from "@/components/ui/Sidebar";
import Providers from "../providers";
import ThemeProvider from "@/components/providers/ThemeProvider";

export const dynamic = "force-dynamic";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  // No auth gate. The backend protects mutating endpoints with JWT (if configured),
  // and pages fall back to NEXT_PUBLIC_DEMO_USER_ID / "demo_user_123" for local use.
  return (
    <Providers>
      <ThemeProvider>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="ml-64 flex-1 p-6">
            {children}
          </main>
        </div>
      </ThemeProvider>
    </Providers>
  );
}
