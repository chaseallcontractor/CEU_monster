"use client";

import { useEffect, useState } from "react";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebaseConfig";
import { useAuth } from "@/providers/AuthProvider";
import { doc, getDoc } from "firebase/firestore";
import MyClassesPreview from "./_components/MyClassesPreview";


type Roles = {
  participant?: boolean;
  creator?: boolean;
  admin?: boolean;
};

type UserDoc = {
  uid: string;
  email: string;
  displayName?: string;
  role?: "participant" | "creator" | "admin"; // legacy
  roles?: Roles;
};

export default function DashboardPage() {
  const { user } = useAuth();
  const [userDoc, setUserDoc] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user) {
        setUserDoc(null);
        setLoading(false);
        return;
      }
      const snap = await getDoc(doc(db, "users", user.uid));
      if (!cancelled) {
        setUserDoc(snap.exists() ? (snap.data() as UserDoc) : null);
        setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const prettyName = userDoc?.displayName || user?.displayName || user?.email;

  const Badge = ({ active, label }: { active?: boolean; label: string }) => (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium mr-2
        ${active ? "bg-black text-white" : "bg-gray-200 text-gray-700"}`}
      title={active ? "Enabled" : "Disabled"}
    >
      {label}
    </span>
  );

  return (
    <main className="p-6 max-w-3xl mx-auto space-y-6">
      <section className="border rounded-2xl p-6">
        <h1 className="text-xl font-semibold">Welcome, {prettyName}</h1>

        {/* Loading / not found states */}
        {loading && <p className="mt-3 text-sm text-gray-600">Loading profile…</p>}
        {!loading && !userDoc && (
          <p className="mt-3 text-sm text-red-600">No profile found.</p>
        )}

        {/* Role badges */}
        {userDoc?.roles && (
          <div className="mt-4">
            <div className="text-sm font-medium mb-2">Your roles</div>
            <Badge active={userDoc.roles.participant} label="Participant" />
            <Badge active={userDoc.roles.creator} label="Creator" />
            <Badge active={userDoc.roles.admin} label="Admin" />
          </div>
        )}

        {/* Creator-only CTA */}
        {userDoc?.roles?.creator && (
          <div className="mt-5">
            <a
              href="/dashboard/classes/new"
              className="inline-flex items-center rounded-md bg-black text-white px-4 py-2"
            >
              + Create a class
            </a>
          </div>
        )}

        {/* Read-only gates (purely visual for now) */}
        {userDoc?.roles?.creator && (
          <div className="mt-5 border rounded-xl p-4">
            <h2 className="font-medium mb-1">Creator tools</h2>
            <p className="text-sm text-gray-600">
              Coming soon: create classes, sessions, and issue certificates.
            </p>
          </div>
        )}
        {userDoc?.roles?.creator && user && (
  <div className="mt-5 border rounded-xl p-4">
    <h2 className="font-medium mb-1">Your recent classes</h2>
    <MyClassesPreview uid={user.uid} />
  </div>
)}
        {userDoc?.roles?.admin && (
          <div className="mt-5 border rounded-xl p-4">
            <h2 className="font-medium mb-1">Admin tools</h2>
            <p className="text-sm text-gray-600">
              Coming soon: approve creators, manage exports, and view audits.
            </p>
          </div>
        )}

        <button
          onClick={() => signOut(auth)}
          className="mt-6 rounded-md bg-black text-white px-4 py-2"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
