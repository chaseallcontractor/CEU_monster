"use client";
import { useEffect, useState } from "react";
import { db } from "../lib/firebaseConfig";
import { collection, getDocs } from "firebase/firestore";

export default function Home() {
  const [status, setStatus] = useState("Checking Firebase...");

  useEffect(() => {
    const testFirebase = async () => {
      try {
        const snapshot = await getDocs(collection(db, "test"));
        setStatus("✅ Firebase connection successful!");
      } catch (error) {
        console.error(error);
        setStatus("❌ Firebase connection failed. Check config.");
      }
    };
    testFirebase();
  }, []);

  return (
    <main className="flex items-center justify-center min-h-screen text-xl">
      {status}
    </main>
  );
}
