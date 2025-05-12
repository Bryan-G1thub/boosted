import { getApp, getApps, initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD43tQSeIHYHWJ0Abz8L0AgRaZLRmg5jbM",
  authDomain: "boosted-4d64d.firebaseapp.com",
  projectId: "boosted-4d64d",
  storageBucket: "boosted-4d64d.firebasestorage.app",
  messagingSenderId: "935790186983",
  appId: "1:935790186983:web:b903318cfd12775f41ed42",
  measurementId: "G-3P7JP87F94"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp()
const db = getFirestore(app);

export { db };