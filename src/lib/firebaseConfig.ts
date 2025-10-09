// src/lib/firebaseConfig.ts
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAdCTpACPZPMYzUD_Lvzx7kdvyHX2ACijw",
  authDomain: "ceu-monster.firebaseapp.com",
  projectId: "ceu-monster",
  storageBucket: "ceu-monster.appspot.com",
  messagingSenderId: "935091978089",
  appId: "1:935091978089:web:91d980454a05ad828487f8"
};

// Prevent re-initialization during hot reload
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Export initialized services for use across your app
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
