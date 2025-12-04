
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Avoid TypeScript errors with process.env
declare const process: any;

// Function to get config from environment variables
const getFirebaseConfig = () => {
  // Checks if essential keys are present
  if (!process.env.FIREBASE_API_KEY || !process.env.FIREBASE_PROJECT_ID) {
    return null;
  }

  return {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
  };
};

const config = getFirebaseConfig();
const app = config ? initializeApp(config) : null;
export const db = app ? getFirestore(app) : null;
export const auth = app ? getAuth(app) : null;

export const isFirebaseConfigured = !!app;
