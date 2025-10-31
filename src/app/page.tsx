"use client";
import { useEffect, useState } from "react";
import { db } from "@/lib/firebaseConfig";      // note: "@/lib/..." import
import { doc, getDoc } from "firebase/firestore";

export default function HomePage() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    (async () => {
      try {
        const snap = await getDoc(doc(db, "public", "health"));
        setStatus(snap.exists() ? "ok" : "error");
      } catch {
        setStatus("error");
      }
    })();
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      {status === "loading" && <p>Checking connection…</p>}
      {status === "ok" && (
        <div className="text-center">
          <p className="text-green-600">✅ Connected to Firebase</p>
          <p className="text-sm text-gray-600 mt-2">
            Continue to <a className="underline" href="/login">login</a> or{" "}
            <a className="underline" href="/signup">signup</a>.
          </p>
        </div>
      )}
      {status === "error" && (
        <p className="text-red-600">❌ Firebase connection failed. Check config.</p>
      )}
    </main>
  );
}
