/**
 * Authentication Example Component
 * 
 * This component demonstrates how to use the custom authentication hook
 * that integrates Firebase Authentication with MySQL database.
 * It includes forms for sign up, sign in, and updating user profile.
 */

import { useState } from 'react';
import useAuth from '../hooks/useAuth';

export default function AuthExample() {
  // Use the custom auth hook that integrates Firebase with MySQL
  const { 
    user, 
    userData, 
    loading, 
    error, 
    signUp, 
    signIn, 
    signInWithGoogle, 
    signOut, 
    updateProfile 
  } = useAuth();

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  // Handle sign up form submission
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    await signUp(email, password);
  };

  // Handle sign in form submission
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await signIn(email, password);
  };

  // Handle profile update form submission
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProfile({ display_name: displayName });
  };

  // Show loading state
  if (loading) {
    return <div className="p-4">Loading...</div>;
  }

  return (
    <div className="p-4 max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-4">Firebase Auth + MySQL Example</h1>
      
      {/* Show error message if any */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* Show authenticated user info */}
      {user ? (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2">Authenticated User</h2>
          <div className="bg-gray-100 p-4 rounded">
            <p><strong>Firebase UID:</strong> {user.uid}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Display Name:</strong> {user.displayName || 'Not set'}</p>
            
            {/* Show MySQL user data */}
            {userData && (
              <div className="mt-4 pt-4 border-t">
                <h3 className="font-semibold mb-2">MySQL User Data</h3>
                <pre className="bg-gray-200 p-2 rounded text-sm overflow-auto">
                  {JSON.stringify(userData, null, 2)}
                </pre>
              </div>
            )}
            
            {/* Update profile form */}
            <form onSubmit={handleUpdateProfile} className="mt-4 pt-4 border-t">
              <h3 className="font-semibold mb-2">Update Profile</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium">
                  Display Name
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full p-2 mt-1 border rounded"
                    required
                  />
                </label>
              </div>
              <button 
                type="submit" 
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Update Profile
              </button>
            </form>
            
            {/* Sign out button */}
            <button 
              onClick={signOut} 
              className="mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign Out
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Sign Up Form */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Sign Up</h2>
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 mt-1 border rounded"
                    required
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 mt-1 border rounded"
                    required
                  />
                </label>
              </div>
              <button 
                type="submit" 
                className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                Sign Up
              </button>
            </form>
          </div>
          
          {/* Sign In Form */}
          <div>
            <h2 className="text-xl font-semibold mb-2">Sign In</h2>
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-sm font-medium">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-2 mt-1 border rounded"
                    required
                  />
                </label>
              </div>
              <div>
                <label className="block text-sm font-medium">
                  Password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-2 mt-1 border rounded"
                    required
                  />
                </label>
              </div>
              <button 
                type="submit" 
                className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Sign In
              </button>
            </form>
            
            {/* Google Sign In Button */}
            <button 
              onClick={signInWithGoogle} 
              className="w-full mt-4 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              Sign In with Google
            </button>
          </div>
        </div>
      )}
    </div>
  );
} 