"use client";

import Link from "next/link";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/providers/AuthProvider";
import { useEffect, useState } from "react";

type Roles = { participant?: boolean; creator?: boolean; admin?: boolean };

export default function EditClassPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const created = searchParams?.get("created") === "1"; // ✅ success banner

  const classId = params?.id as string | undefined;
  const { user, loading } = useAuth();

  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ceuHours, setCeuHours] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState(false);

  // Load roles
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.uid) {
        setIsCreator(null);
        setRolesLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      const roles = (snap.exists() ? (snap.data() as any).roles : undefined) as Roles | undefined;
      if (!cancelled) {
        setIsCreator(!!roles?.creator);
        setRolesLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  // Load class doc
  useEffect(() => {
    const load = async () => {
      if (!classId || !isCreator) return;
      const ref = doc(db, "classes", classId);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        setMissing(true);
        setLoaded(true);
        return;
      }
      const d = snap.data() as any;
      setTitle(d.title || "");
      setDescription(d.description || "");
      setCeuHours(typeof d.ceuHours === "number" ? d.ceuHours : "");
      setLoaded(true);
    };
    load();
  }, [classId, isCreator]);

  if (loading || rolesLoading) return <div className="p-6">Loading…</div>;

  if (!user || !isCreator) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Creator access required</h1>
        <Link href="/dashboard" className="mt-3 inline-block text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  if (!classId || missing) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Class not found</h1>
        <p className="mt-2">This class ID is missing or the document no longer exists.</p>
        <Link href="/dashboard/classes" className="text-sm underline mt-4 inline-block">
          Back to classes
        </Link>
      </div>
    );
  }

  const onSave = async () => {
    setBusy(true);
    const ref = doc(db, "classes", classId);
    await updateDoc(ref, {
      title: title.trim(),
      description: description.trim(),
      ceuHours: ceuHours === "" ? null : Number(ceuHours),
    });
    setBusy(false);
    alert("Saved.");
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Edit Class</h1>

        <div className="flex items-center gap-2">
          {/* ✅ New: quick link to the certificate template page */}
          <button
            onClick={() => router.push(`/dashboard/classes/${classId}/certificate`)}
            className="rounded-xl border px-3 py-2 text-sm"
            title="Set up the certificate template and QR slide"
          >
            Certificate Template →
          </button>

          <Link href="/dashboard/classes" className="text-sm underline">
            Back to classes
          </Link>
        </div>
      </div>

      {/* ✅ Success banner after creating a new class */}
      {created && (
        <div className="rounded-xl border border-green-300 bg-green-50 px-4 py-3 text-sm text-green-800">
          ✅ Class created successfully.
        </div>
      )}

      {!loaded ? (
        <p>Loading class…</p>
      ) : (
        <div className="max-w-xl space-y-4">
          <div>
            <label className="block text-sm font-medium">Title</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., NEC 2024 Update – Atlanta Session"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Description</label>
            <textarea
              className="mt-1 w-full rounded-xl border px-3 py-2 min-h-[120px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What participants will learn…"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">CEU Hours</label>
            <input
              type="number"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              value={ceuHours}
              onChange={(e) => setCeuHours(e.target.value === "" ? "" : Number(e.target.value))}
              placeholder="e.g., 2"
              min={0}
              step={0.5}
            />
          </div>

          <button
            onClick={onSave}
            disabled={busy}
            className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
