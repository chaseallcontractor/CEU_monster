"use client";

import Link from "next/link";
import { useAuth } from "@/providers/AuthProvider";
import MyClassesPreview from "./_components/MyClassesPreview";

export default function DashboardHome() {
  const { user } = useAuth();

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm opacity-70">
            {user?.email ? `Signed in as ${user.email}` : "Not signed in"}
          </p>
        </div>
        <Link
          href="/dashboard/classes/new"
          className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium bg-black text-white hover:opacity-90"
        >
          + New Class
        </Link>
      </header>

      <section>
        <h2 className="text-lg font-medium">Your classes (recent)</h2>
        <MyClassesPreview uid={user?.uid ?? ""} />
      </section>
    </main>
  );
}
