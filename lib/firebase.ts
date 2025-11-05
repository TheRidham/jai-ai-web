import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: "AIzaSyBI4VvhQggxhaTDeES_iPcxyLfxiIhSd98",
  authDomain: "jai-ai-30103.firebaseapp.com",
  projectId: "jai-ai-30103",
  storageBucket: "jai-ai-30103.firebasestorage.app",
  messagingSenderId: "504788514550",
  appId: "1:504788514550:web:a4d832cc7e45eb38215ed7",
  measurementId: "G-QGP34E8X35"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
// Functions are deployed to asia-south1 in the backend; initialize the client to use the same region
export const functions = getFunctions(app, 'asia-south1');

export default app;