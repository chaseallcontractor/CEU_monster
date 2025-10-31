"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/providers/AuthProvider";

type Roles = { participant?: boolean; creator?: boolean; admin?: boolean };

export default function NewClassPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [ceuHours, setCeuHours] = useState<number | "">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load roles from users/{uid}
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.uid) {
        setIsCreator(null);
        setRolesLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        const roles = (snap.exists() ? (snap.data() as any).roles : undefined) as Roles | undefined;
        if (!cancelled) {
          setIsCreator(!!roles?.creator);
          setRolesLoading(false);
        }
      } catch {
        if (!cancelled) {
          setIsCreator(false);
          setRolesLoading(false);
        }
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const onCreate = async () => {
    setError(null);

    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setError("Title is required.");
      return;
    }
    if (!user || !isCreator) {
      setError("Creator access required.");
      return;
    }

    try {
      setBusy(true);
      const docRef = await addDoc(collection(db, "classes"), {
        title: cleanTitle,
        description: description.trim(),
        ceuHours: ceuHours === "" ? null : Number(ceuHours),
        ownerUid: user.uid,
        createdAt: serverTimestamp(),
      });
      // pass a flag so the edit page can show a green success banner
      router.replace(`/dashboard/classes/${docRef.id}/edit?created=1`);
    } catch (e: any) {
      setError(e?.message ?? "Failed to create class.");
      setBusy(false);
    }
  };

  if (loading || rolesLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">New Class</h1>
        <p className="mt-4">Loading…</p>
      </div>
    );
  }

  if (!user || !isCreator) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Creator access required</h1>
        <p className="mt-2 text-gray-600">
          You need creator permissions to add classes. Contact an admin to request access.
        </p>
        <Link href="/dashboard" className="mt-4 inline-block text-sm underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Class</h1>
        <Link href="/dashboard/classes" className="text-sm underline">
          Back to classes
        </Link>
      </div>

      <div className="max-w-xl space-y-4">
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium">Title *</label>
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
          onClick={onCreate}
          disabled={busy}
          className="rounded-xl bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {busy ? "Creating…" : "Create Class"}
        </button>
      </div>
    </div>
  );
}
