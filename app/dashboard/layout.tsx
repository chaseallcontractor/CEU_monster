"use client";

import { ReactNode, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/AuthProvider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <main className="min-h-screen grid place-items-center p-10">
        Checking auth…
      </main>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Topbar */}
      <header className="border-b">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/dashboard" className="font-medium underline">Dashboard</Link>
            <Link href="/dashboard/classes" className="underline">Classes</Link>
            <Link href="/dashboard/classes/new" className="underline">New Class</Link>
          </nav>
          <div className="text-xs opacity-70">
            {user?.email}
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
