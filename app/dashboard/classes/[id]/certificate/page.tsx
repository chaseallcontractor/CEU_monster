"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { auth, db } from "@/lib/firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

type CertForm = {
  title: string;
  ceuHours: number | "";
  issuerOrgName: string;
  instructorName: string; // NEW
  logoUrl: string;
  qrMode: "live" | "test";
  maxIssues: number | "" | null;
};

export default function CertificateTemplatePage() {
  const params = useParams();
  const classId = params?.id as string;
  const router = useRouter();

  const [form, setForm] = useState<CertForm>({
    title: "",
    ceuHours: "",
    issuerOrgName: "",
    instructorName: "", // NEW
    logoUrl: "",
    qrMode: "live",
    maxIssues: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<"idle" | "ok" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Load existing template (if any)
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        if (!classId) return;
        const ref = doc(db, "classes", classId, "certificates", "default");
        const snap = await getDoc(ref);
        if (mounted && snap.exists()) {
          const d = snap.data() as any;
          setForm({
            title: d.title ?? "",
            ceuHours: typeof d.ceuHours === "number" ? d.ceuHours : "",
            issuerOrgName: d.issuerOrgName ?? "",
            instructorName: d.instructorName ?? "", // NEW
            logoUrl: d.logoUrl ?? "",
            qrMode: d.qrMode === "test" ? "test" : "live",
            maxIssues:
              typeof d.maxIssues === "number"
                ? d.maxIssues
                : d.maxIssues === null
                ? null
                : "",
          });
        }
      } catch (e: any) {
        console.error(e);
        setErrorMsg(e?.message ?? "Failed to load certificate template.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [classId]);

  const onChange = (field: keyof CertForm, value: string) => {
    setSaved("idle");
    setForm((prev) => ({
      ...prev,
      [field]:
        field === "ceuHours"
          ? value === "" ? "" : Number(value)
          : field === "maxIssues"
          ? value === "" ? "" : Number(value)
          : value,
    }));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaved("idle");
    setErrorMsg("");

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("You must be signed in to save a certificate template.");
      if (!classId) throw new Error("Missing class ID.");
      if (!form.title.trim()) throw new Error("Title is required.");
      if (form.ceuHours === "" || Number.isNaN(form.ceuHours)) {
        throw new Error("CEU Hours must be a number.");
      }

      const ref = doc(db, "classes", classId, "certificates", "default");

      await setDoc(
        ref,
        {
          title: form.title.trim(),
          ceuHours: Number(form.ceuHours),
          issuerOrgName: form.issuerOrgName.trim(),
          instructorName: form.instructorName.trim(), // NEW
          logoUrl: form.logoUrl.trim(),
          qrMode: form.qrMode, // 'live' | 'test'
          ownerUid: user.uid,
          maxIssues:
            form.maxIssues === "" ? null : form.maxIssues === null ? null : Number(form.maxIssues),
          issuedCount: 0,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );

      setSaved("ok");
      // Optional: go straight to QR page:
      // router.push(`/dashboard/classes/${classId}/certificate/qr`);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e?.message ?? "Failed to save.");
      setSaved("error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Certificate Template</h1>
        <p className="mt-2 text-sm opacity-70">Loading…</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Certificate Template</h1>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded-xl border text-sm"
            onClick={() => router.push(`/dashboard/classes/${classId}/certificate/qr`)}
            title="Generate QR & export slide"
          >
            QR &amp; Slide →
          </button>
          <button
            className="px-3 py-2 rounded-xl border text-sm"
            onClick={() => router.push(`/dashboard/classes/${classId}/edit`)}
          >
            ← Back to Class
          </button>
        </div>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="block text-sm font-medium mb-1">Certificate Title *</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="e.g., Residential HVAC Fundamentals"
            value={form.title}
            onChange={(e) => onChange("title", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">CEU Hours *</label>
            <input
              type="number"
              min={0}
              step="0.5"
              className="w-full rounded-xl border px-3 py-2"
              placeholder="e.g., 3"
              value={form.ceuHours}
              onChange={(e) => onChange("ceuHours", e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">QR Mode</label>
            <select
              className="w-full rounded-xl border px-3 py-2"
              value={form.qrMode}
              onChange={(e) => onChange("qrMode", e.target.value)}
            >
              <option value="live">Live (emails real certificate)</option>
              <option value="test">Test (watermarked; no billing)</option>
            </select>
            <p className="text-xs mt-1 opacity-70">
              Use <b>Test</b> to validate your slide/QR without emailing a real certificate.
            </p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Issuer Organization Name</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="e.g., Conditioned Air Association of Georgia"
            value={form.issuerOrgName}
            onChange={(e) => onChange("issuerOrgName", e.target.value)}
          />
        </div>

        {/* NEW: Instructor Name */}
        <div>
          <label className="block text-sm font-medium mb-1">Instructor Name</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="e.g., Jane Smith"
            value={form.instructorName}
            onChange={(e) => onChange("instructorName", e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Organization Logo URL</label>
          <input
            className="w-full rounded-xl border px-3 py-2"
            placeholder="https://…/logo.png"
            value={form.logoUrl}
            onChange={(e) => onChange("logoUrl", e.target.value)}
          />
          {form.logoUrl ? (
            <div className="mt-2">
              <img
                src={form.logoUrl}
                alt="Logo preview"
                className="h-14 w-auto rounded-lg border"
              />
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Max Issues (for $5/QR metering)</label>
          <input
            type="number"
            min={0}
            step="1"
            className="w-full rounded-xl border px-3 py-2"
            placeholder="Leave blank for unlimited (subscription)"
            value={form.maxIssues === null ? "" : form.maxIssues}
            onChange={(e) => onChange("maxIssues", e.target.value)}
          />
          <p className="text-xs mt-1 opacity-70">
            Blank = unlimited (requires active subscription). Set a number to cap issues on pay-per-QR.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-black text-white disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save Template"}
          </button>

          {saved === "ok" && <span className="text-green-600 text-sm">Saved!</span>}
          {saved === "error" && (
            <span className="text-red-600 text-sm">Couldn’t save. {errorMsg}</span>
          )}
        </div>

        <div className="pt-2">
          <p className="text-sm opacity-70">
            Next: generate a QR and export a single-slide PDF for PowerPoint.
          </p>
        </div>
      </form>
    </div>
  );
}

