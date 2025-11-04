"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "@/lib/firebaseConfig";

interface ClassDoc {
  id: string;
  title: string;
  ceuHours?: number;
  createdAt?: any;
}

export default function MyClassesPreview({ uid }: { uid: string }) {
  const [classes, setClasses] = useState<ClassDoc[]>([]);

  useEffect(() => {
    if (!uid) return;
    // Kept simple: no orderBy to avoid extra index requirement
    const q = query(collection(db, "classes"), where("ownerUid", "==", uid));
    const unsub = onSnapshot(q, (snap) => {
      const rows: ClassDoc[] = [];
      snap.forEach((d) => rows.push({ id: d.id, ...(d.data() as any) }));
      setClasses(rows);
    });
    return () => unsub();
  }, [uid]);

  if (classes.length === 0) {
    return <p className="mt-2 text-sm text-gray-500">No classes yet.</p>;
  }

  return (
    <ul className="mt-2 space-y-2">
      {classes.slice(0, 3).map((c) => (
        <li key={c.id}>
          <Link
            href={`/dashboard/classes/${c.id}/edit`}
            className="block rounded-lg border px-3 py-2 hover:bg-gray-50 dark:hover:bg-white/5 transition cursor-pointer"
            title="Open class"
          >
            <div className="flex justify-between items-center">
              <span className="font-medium truncate">{c.title || "Untitled class"}</span>
              {typeof c.ceuHours === "number" ? (
                <span className="text-sm text-gray-600 dark:text-gray-300">{c.ceuHours}h</span>
              ) : null}
            </div>
          </Link>
        </li>
      ))}
      <li>
        <Link href="/dashboard/classes" className="block text-sm underline mt-2">
          View all classes →
        </Link>
      </li>
    </ul>
  );
}
