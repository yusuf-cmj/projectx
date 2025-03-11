/**
 * Auth Example Page
 * 
 * This page demonstrates the integration between Firebase Authentication and MySQL.
 * It showcases how to authenticate users with Firebase and store their additional
 * profile data in a MySQL database.
 */

'use client';

import AuthExample from '../../components/AuthExample';

export default function AuthExamplePage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold text-center mb-8">
        Firebase Auth + MySQL Integration
      </h1>
      <p className="text-center max-w-lg mx-auto mb-8 text-gray-600">
        This example shows how to use Firebase Authentication for user authentication
        while storing user data in a Google Cloud SQL (MySQL) database.
      </p>
      
      <AuthExample />
    </div>
  );
} 