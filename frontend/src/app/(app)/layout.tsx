import Sidebar from "@/components/ui/Sidebar";
import Providers from "../providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="ml-64 flex-1 p-6">
          {children}
        </main>
      </div>
    </Providers>
  );
}
