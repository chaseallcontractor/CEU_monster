"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { db } from "@/lib/firebaseConfig";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

type CertTemplate = {
  title?: string;
  ceuHours?: number;
  issuerOrgName?: string;
  logoUrl?: string;
  qrMode?: "live" | "test";
};

export default function RedeemPage() {
  const params = useParams();
  const classId = params?.id as string;

  const [tpl, setTpl] = useState<CertTemplate | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState<string>("");

  // Client-only origin to avoid hydration mismatch
  const [origin, setOrigin] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window !== "undefined") setOrigin(window.location.origin);
  }, []);

  // Load basic certificate info to label the page
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ref = doc(db, "classes", classId, "certificates", "default");
        const snap = await getDoc(ref);
        if (!snap.exists()) throw new Error("Certificate not found.");
        if (!mounted) return;
        setTpl(snap.data() as CertTemplate);
      } catch (e: any) {
        console.error(e);
        if (mounted) setErr(e?.message || "Unable to load certificate.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [classId]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setOk(false);

    const emailTrim = email.trim().toLowerCase();

    // simple email check
    if (!emailTrim || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrim)) {
      setErr("Enter a valid email address.");
      return;
    }

    try {
      setBusy(true);
      await addDoc(collection(db, "classes", classId, "redemptions"), {
        certId: "default",
        learnerEmail: emailTrim,
        learnerName: name.trim() || null,
        status: tpl?.qrMode === "test" ? "test" : "pending",
        createdAt: serverTimestamp(), // enforced by rules
      });
      setOk(true);
      setEmail("");
      setName("");
    } catch (e: any) {
      console.error(e);
      setErr(e?.message || "Could not submit. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3">
        {tpl?.logoUrl ? (
          <img src={tpl.logoUrl} alt="Logo" className="h-10 w-auto" />
        ) : null}
        <h1 className="text-2xl font-semibold">Redeem CEU Certificate</h1>
      </div>

      <div className="mt-3 text-sm opacity-80">
        {tpl?.title ? <div className="font-medium">{tpl.title}</div> : null}
        {typeof tpl?.ceuHours === "number" ? (
          <div>
            {tpl.ceuHours} CEU hour{tpl.ceuHours === 1 ? "" : "s"}
          </div>
        ) : null}
        {tpl?.issuerOrgName ? (
          <div>Presented by {tpl.issuerOrgName}</div>
        ) : null}
        {tpl?.qrMode === "test" ? (
          <div className="text-amber-600">TEST MODE – no email sent</div>
        ) : null}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Email *</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Name (optional)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Submitting…" : "Email my certificate"}
        </button>

        {ok ? (
          <div className="text-green-700 text-sm mt-2">
            Thanks! If this was a live class, your certificate will arrive
            shortly.
          </div>
        ) : null}

        {err ? <div className="text-red-600 text-sm mt-2">{err}</div> : null}
      </form>

      <div className="mt-6 text-xs opacity-60">
        Having trouble? This link should match the slide:
        {origin ? (
          <div className="mt-1 break-all">
            {origin}/qr/{classId}
          </div>
        ) : null}
      </div>
    </div>
  );
}
