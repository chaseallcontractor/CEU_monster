"use client";

import { useEffect, useState } from "react";
import type { Metadata } from "next";
import { db } from "@/lib/firebaseConfig";
import { doc, getDoc } from "firebase/firestore";

export const metadata: Metadata = {
  title: "CEU Monster",
  description: "Manage continuing education certificates.",
};

type Status = "loading" | "ok" | "warn" | "error";

export default function HomePage() {
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    // Optional Firestore connectivity/health document:
    // Collection: public  |  Doc id: health
    (async () => {
      try {
        const ref = doc(db, "public", "health");
        const snap = await getDoc(ref);
        if (snap.exists()) {
          setStatus("ok");
        } else {
          // Firestore reachable, but the health doc isn't there
          setStatus("warn");
        }
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-xl mx-auto text-center">
        {/* Logo / Brand */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {/* swap to your real logo if desired */}
          <img
            src="https://storage.googleapis.com/public-ceu-monster-assets/logo-dark.png"
            alt="CEU Monster"
            className="h-9"
          />
          <span className="text-2xl font-semibold">CEU Monster</span>
        </div>

        <h1 className="text-3xl font-bold mb-3">Welcome</h1>
        <p className="text-gray-600 mb-8">
          Manage classes, generate certificates, and help your learners track CEU hours.
        </p>

        {/* Status strip */}
        {status === "loading" && (
          <p className="text-gray-700 mb-6">Checking Firebase connection…</p>
        )}
        {status === "ok" && (
          <p className="text-green-600 mb-6">✅ Connected to Firebase</p>
        )}
        {status === "warn" && (
          <p className="text-amber-600 mb-6">
            ⚠️ Connected to Firebase, but <code>public/health</code> was not found.
          </p>
        )}
        {status === "error" && (
          <p className="text-red-600 mb-6">
            ❌ Firebase connection failed. Please verify your config.
          </p>
        )}

        {/* Primary actions */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          <a
            href="/dashboard/certificates"
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Go to Certificates
          </a>
          <a
            href="/login"
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Log in
          </a>
          <a
            href="/signup"
            className="px-4 py-2 rounded-lg border hover:bg-gray-50"
          >
            Sign up
          </a>
        </div>

        <p className="text-xs text-gray-400 mt-8">
          Tip: Create <code>public/health</code> in Firestore to show the green “Connected” state.
        </p>
      </div>
    </main>
  );
}
