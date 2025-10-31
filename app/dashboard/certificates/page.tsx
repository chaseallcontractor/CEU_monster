"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "../../../lib/firebaseClient";
import {
  collection,
  getDocs,
  limit,
  query,
  where,
} from "firebase/firestore";

type Row = {
  id: string;
  learnerName?: string | null;
  learnerEmail: string;
  certificateUrl?: string;
  processedAt?: any;
};

export default function CertificatesPage() {
  const [classId, setClassId] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);

  const disabled = useMemo(() => !classId.trim(), [classId]);

  async function load() {
    if (!classId.trim()) return;
    setLoading(true);
    try {
      console.log("[certs] Using classId:", classId.trim());
      // Minimal query: only filter by status (no orderBy) to remove index variables
      const redemptionsRef = collection(db, "classes", classId.trim(), "redemptions");
      const q = query(redemptionsRef, where("status", "==", "processed"), limit(50));
      const snap = await getDocs(q);
      console.log("[certs] snap.size =", snap.size);
      const nextRows: Row[] = snap.docs.map((d) => {
        const data = d.data() as any;
        console.log("[certs] doc", d.id, data);
        return {
          id: d.id,
          learnerName: data.learnerName ?? null,
          learnerEmail: data.learnerEmail,
          certificateUrl: data.certificateUrl,
          processedAt: data.processedAt,
        };
      });
      setRows(nextRows);
    } catch (err) {
      console.error("[certs] Firestore error:", err);
      alert("Firestore error: " + (err as any)?.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // setClassId("0LFThWEsloeufqmIkXzG"); // optional prefill
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-semibold mb-4">Certificates</h1>

      <div className="flex gap-2 items-end mb-6">
        <div className="flex-1">
          <label className="block text-sm mb-1">Class ID</label>
          <input
            className="w-full border rounded-lg px-3 py-2"
            placeholder="Enter classId (e.g., 0LFThWEsloeufqmIkXzG)"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
          />
        </div>
        <button
          className="px-4 py-2 rounded-lg border disabled:opacity-50"
          onClick={load}
          disabled={disabled || loading}
        >
          {loading ? "Loading…" : "Load"}
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-gray-600">
          {disabled
            ? "Enter a classId and click Load."
            : loading
            ? "Loading…"
            : "No processed certificates found."}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className="border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="font-medium">
                  {r.learnerName || r.learnerEmail}
                </div>
                <div className="text-sm text-gray-600">ID: {r.id}</div>
              </div>
              <div className="flex gap-2">
                <a
                  href={r.certificateUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-2 rounded-lg border"
                >
                  Download
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
