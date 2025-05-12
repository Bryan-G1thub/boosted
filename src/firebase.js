import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

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
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);