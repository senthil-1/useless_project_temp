import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBwlKL0nMShgYZFM5YnAezswWzD16PIor8",
  authDomain: "ministry-of-useless-affairs.firebaseapp.com",
  projectId: "ministry-of-useless-affairs",
  storageBucket:
    "ministry-of-useless-affairs.firebasestorage.app",
  messagingSenderId: "636101339153",
  appId: "1:636101339153:web:e8a8b833a83771666ea9b0",
  measurementId: "G-7DV4RKWXYV",
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;