/**
 * Firebase Configuration Module
 * 
 * This module initializes the Firebase application with configuration from environment variables.
 * It provides a central export point for Firebase services throughout the application.
 * 
 * Environment variables are used to secure sensitive Firebase configuration information
 * instead of hardcoding these values directly in the source code.
 */

// Import required Firebase modules
import { initializeApp } from "firebase/app";
// Additional Firebase services can be imported here as needed
import { getAuth } from "firebase/auth";
// import { getFirestore } from "firebase/firestore";
// import { getStorage } from "firebase/storage";

/**
 * Firebase configuration object populated from environment variables
 * 
 * All Firebase configuration values should be defined in .env.local file
 * and never committed to version control for security reasons
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Initialize Firebase application with configuration
 * This instance will be shared throughout the application
 */
const app = initializeApp(firebaseConfig);

// Export Firebase services for use in other modules
// export const auth = getAuth(app);
// export const db = getFirestore(app);
// export const storage = getStorage(app);

export const auth = getAuth(app);