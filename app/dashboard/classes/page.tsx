"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";
import { useAuth } from "@/providers/AuthProvider";

type Roles = { participant?: boolean; creator?: boolean; admin?: boolean };

interface ClassDoc {
  id: string;
  title: string;
  description?: string;
  ceuHours?: number;
  ownerUid: string;
  createdAt?: any;
}

async function fetchUserProfile(uid: string) {
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? (snap.data() as any) : null;
}

export default function CreatorClassesPage() {
  const { user, loading } = useAuth();
  const [isCreator, setIsCreator] = useState<boolean | null>(null);
  const [rolesLoading, setRolesLoading] = useState(true);

  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [creatorCache, setCreatorCache] = useState<
    Record<string, { displayName?: string; email?: string } | null>
  >({});

  // Load roles (from users/{uid})
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

  // Realtime list of this creator's classes
  useEffect(() => {
    if (!user?.uid || !isCreator) return;
    // NOTE: removed orderBy("createdAt","desc") to avoid requiring an index immediately
    const q = query(collection(db, "classes"), where("ownerUid", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const rows: ClassDoc[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
      setClasses(rows);
    });
    return () => unsub();
  }, [user?.uid, isCreator]);

  // Preload creator display labels
  const ownerUids = useMemo(
    () => Array.from(new Set(classes.map((c) => c.ownerUid))).filter(Boolean),
    [classes]
  );
  useEffect(() => {
    let cancelled = false;
    (async () => {
      for (const uid of ownerUids) {
        if (creatorCache[uid] !== undefined) continue;
        const profile = await fetchUserProfile(uid);
        if (!cancelled) setCreatorCache((prev) => ({ ...prev, [uid]: profile }));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ownerUids, creatorCache]);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this class? This cannot be undone.")) return;
    await deleteDoc(doc(db, "classes", id));
  };

  // Loading states
  if (loading || rolesLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Your Classes</h1>
        <p className="mt-4">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Your Classes</h1>
        <p className="mt-4">Please log in to view your classes.</p>
      </div>
    );
  }

  if (!isCreator) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold">Creator access required</h1>
        <p className="mt-4">
          Your account does not have creator permissions. Contact support or an admin to request access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your Classes</h1>
        <Link
          href="/dashboard/classes/new"
          className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium bg-black text-white hover:opacity-90"
        >
          + New Class
        </Link>
      </div>

      {classes.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center">
          <p className="text-lg">You haven’t created any classes yet.</p>
          <Link
            href="/dashboard/classes/new"
            className="mt-4 inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium bg-black text-white hover:opacity-90"
          >
            Create your first class
          </Link>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {classes.map((c) => {
            const creator = creatorCache[c.ownerUid];
            const creatorLabel =
              creator?.displayName || creator?.email || (c.ownerUid ? `uid:${c.ownerUid}` : "Unknown");

            // Whole card clickable -> goes to edit page
            return (
              <li key={c.id}>
                <Link href={`/dashboard/classes/${c.id}/edit`} className="block rounded-2xl border p-5 hover:bg-gray-50">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-semibold leading-tight">{c.title}</h3>
                      {c.ceuHours ? <p className="mt-1 text-sm text-gray-600">{c.ceuHours} CEU hours</p> : null}
                      <p className="mt-1 text-xs text-gray-500">Created by {creatorLabel}</p>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-lg border px-3 py-1.5 text-sm">Open</span>
                    </div>
                  </div>
                  {c.description ? (
                    <p className="mt-3 text-sm text-gray-700 line-clamp-3">{c.description}</p>
                  ) : null}
                </Link>

                <div className="mt-2 flex items-center justify-end">
                  <button
                    onClick={() => handleDelete(c.id)}
                    className="rounded-lg border px-3 py-1.5 text-sm hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
