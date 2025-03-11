/**
 * Authentication Hook
 * 
 * This custom hook provides authentication functionality by combining
 * Firebase Authentication with MySQL database operations.
 * It handles user authentication state and ensures user data is synced
 * between Firebase and MySQL database.
 */

import { useState, useEffect } from 'react';
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { auth } from '../lib/firebase';
import { createUser, getUserByUid, updateUser } from '../lib/db';

// Define the structure of our authentication state
interface AuthState {
  user: User | null;
  userData: any | null;
  loading: boolean;
  error: string | null;
}

// Define the return type of our hook
interface UseAuth extends AuthState {
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
}

/**
 * Custom hook for authentication that combines Firebase Auth with MySQL
 * @returns Authentication state and methods
 */
export default function useAuth(): UseAuth {
  // Initialize auth state
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    userData: null,
    loading: true,
    error: null
  });

  /**
   * Loads user data from MySQL after Firebase authentication
   * @param user Firebase user object
   */
  const loadUserData = async (user: User | null) => {
    if (!user) {
      setAuthState(prev => ({ ...prev, userData: null }));
      return;
    }

    try {
      // Try to get user data from MySQL
      let userData = await getUserByUid(user.uid);
      
      // If user doesn't exist in MySQL but exists in Firebase, create the record
      if (!userData) {
        await createUser(user);
        userData = await getUserByUid(user.uid);
      }
      
      setAuthState(prev => ({ ...prev, userData }));
    } catch (error) {
      console.error("Error loading user data from MySQL:", error);
      setAuthState(prev => ({ 
        ...prev, 
        error: "Failed to load user data from database" 
      }));
    }
  };

  // Monitor authentication state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setAuthState(prev => ({ ...prev, user, loading: false }));
      await loadUserData(user);
    });

    // Cleanup subscription
    return () => unsubscribe();
  }, []);

  /**
   * Sign up with email and password
   * Creates both Firebase Auth user and MySQL record
   */
  const signUp = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const { user } = await createUserWithEmailAndPassword(auth, email, password);
      
      // The user record in MySQL will be created by the onAuthStateChanged listener
    } catch (error: any) {
      console.error("Sign up error:", error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || "Failed to sign up" 
      }));
    }
  };

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string) => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      await signInWithEmailAndPassword(auth, email, password);
      // User data will be loaded by the onAuthStateChanged listener
    } catch (error: any) {
      console.error("Sign in error:", error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || "Failed to sign in" 
      }));
    }
  };

  /**
   * Sign in with Google
   */
  const signInWithGoogle = async () => {
    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // User data will be loaded by the onAuthStateChanged listener
    } catch (error: any) {
      console.error("Google sign in error:", error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || "Failed to sign in with Google" 
      }));
    }
  };

  /**
   * Sign out from Firebase
   */
  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      // Auth state changes will be handled by onAuthStateChanged
    } catch (error: any) {
      console.error("Sign out error:", error);
      setAuthState(prev => ({ 
        ...prev, 
        error: error.message || "Failed to sign out" 
      }));
    }
  };

  /**
   * Update user profile data in MySQL
   */
  const updateProfile = async (data: any) => {
    try {
      if (!authState.user) throw new Error("No authenticated user");
      
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
      // Update in MySQL
      await updateUser(authState.user.uid, data);
      
      // Reload user data
      const userData = await getUserByUid(authState.user.uid);
      
      setAuthState(prev => ({ 
        ...prev, 
        userData, 
        loading: false 
      }));
    } catch (error: any) {
      console.error("Profile update error:", error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message || "Failed to update profile" 
      }));
    }
  };

  return {
    ...authState,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    updateProfile
  };
} 