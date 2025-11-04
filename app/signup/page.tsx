"use client";
import { useState } from "react";
import { auth } from "@/lib/firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebaseConfig";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

type Roles = {
  participant: boolean;
  creator: boolean;
  admin: boolean;
};

export default function SignUpPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      // Create the auth user
      const cred = await createUserWithEmailAndPassword(
        auth,
        form.email,
        form.password
      );

      // Optional: set display name
      if (form.name.trim()) {
        await updateProfile(cred.user, { displayName: form.name.trim() });
      }

      // NEW: structured roles object
      const roles: Roles = { participant: true, creator: false, admin: false };

      // Create the Firestore user profile document
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid,
        email: cred.user.email,
        displayName: cred.user.displayName || form.name.trim() || "",
        role: "participant", // keep temporarily for backward-compat
        roles,               // <-- new roles object
        createdAt: serverTimestamp(),
      });

      // Go to dashboard
      router.push("/dashboard");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Sign up failed";
      setErr(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-4 border rounded-2xl p-6 shadow"
      >
        <h1 className="text-2xl font-semibold text-center">Create your account</h1>

        <input
          className="w-full border rounded-md p-2"
          placeholder="Full name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="email"
          className="w-full border rounded-md p-2"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          className="w-full border rounded-md p-2"
          placeholder="Password (min 6 chars)"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          minLength={6}
          required
        />

        {err && <p className="text-red-600 text-sm">{err}</p>}

        <button
          disabled={loading}
          className="w-full rounded-md p-2 bg-black text-white disabled:opacity-60"
        >
          {loading ? "Creating..." : "Sign up"}
        </button>

        <p className="text-sm text-center">
          Already have an account?{" "}
          <a href="/login" className="underline">
            Log in
          </a>
        </p>
      </form>
    </main>
  );
}
