/**
 * Database Service Module for MySQL Integration
 * 
 * This module handles the connection and operations with Google Cloud SQL (MySQL)
 * while integrating with Firebase Authentication. It provides functions for
 * creating, updating, and retrieving user data from MySQL.
 */

import mysql from 'mysql2/promise';
import { auth } from './firebase';
import { User } from 'firebase/auth';

// Database connection configuration
// Replace these values with your Cloud SQL instance details
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  // If using Cloud SQL Auth Proxy (recommended for local development)
  // socketPath: process.env.DB_SOCKET_PATH
};

/**
 * Creates a database connection pool
 * Using a pool improves performance by reusing connections
 */
const pool = mysql.createPool(dbConfig);

/**
 * Creates a new user record in the MySQL database after Firebase authentication
 * @param user Firebase user object
 * @returns Promise resolving to the created user's ID
 */
export async function createUser(user: User) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        'INSERT INTO users (uid, email, display_name) VALUES (?, ?, ?)',
        [user.uid, user.email, user.displayName]
      );
      
      return user.uid;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error creating user in MySQL:', error);
    throw error;
  }
}

/**
 * Retrieves user data from MySQL database using Firebase UID
 * @param uid Firebase user ID
 * @returns Promise resolving to user data or null if not found
 */
export async function getUserByUid(uid: string) {
  try {
    const connection = await pool.getConnection();
    
    try {
      const [rows] = await connection.execute(
        'SELECT * FROM users WHERE uid = ?',
        [uid]
      );
      
      return rows[0] || null;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user from MySQL:', error);
    throw error;
  }
}

/**
 * Updates user data in MySQL database
 * @param uid Firebase user ID
 * @param userData Object containing fields to update
 * @returns Promise resolving to boolean indicating success
 */
export async function updateUser(uid: string, userData: any) {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Create SET clause and values array for the query
      const entries = Object.entries(userData);
      const setClause = entries.map(([key]) => `${key} = ?`).join(', ');
      const values = entries.map(([_, value]) => value);
      
      // Add uid to values array
      values.push(uid);
      
      await connection.execute(
        `UPDATE users SET ${setClause} WHERE uid = ?`,
        values
      );
      
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error updating user in MySQL:', error);
    throw error;
  }
}

/**
 * Deletes user data from MySQL database
 * @param uid Firebase user ID
 * @returns Promise resolving to boolean indicating success
 */
export async function deleteUser(uid: string) {
  try {
    const connection = await pool.getConnection();
    
    try {
      await connection.execute(
        'DELETE FROM users WHERE uid = ?',
        [uid]
      );
      
      return true;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error deleting user from MySQL:', error);
    throw error;
  }
} 