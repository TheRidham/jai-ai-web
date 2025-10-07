// lib/firebase.ts
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, RecaptchaVerifier } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, "asia-south1");

// Setup reCAPTCHA for phone authentication
export const setupRecaptcha = (containerId: string) => {
  const recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
    size: 'normal',
    callback: () => {
      // reCAPTCHA solved, allow signInWithPhoneNumber
      console.log('reCAPTCHA verified');
    },
    'expired-callback': () => {
      // Response expired, reset reCAPTCHA
      console.log('reCAPTCHA expired');
    }
  });
  return recaptchaVerifier;
};

export default app;