/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
export { onAuthStateChanged };
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, where, orderBy, limit, onSnapshot, addDoc, serverTimestamp, Timestamp, getDocFromServer } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

// Google Auth Provider
const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user exists in Firestore, if not create
    const userDocRef = doc(db, 'users', user.uid);
    const userSnapshot = await getDoc(userDocRef);
    
    if (!userSnapshot.exists()) {
      await setDoc(userDocRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        joinedAt: new Date().toISOString(),
      });
    }
    return user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const logOut = () => signOut(auth);

// Test Connection (as per critical constraint)
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or internet connection.");
    }
  }
}
testConnection();

// Error handling helper (as per critical constraint)
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Data Types
export interface StudyRoom {
  id: string;
  title: string;
  subject: string;
  description: string;
  creatorId: string;
  creatorName: string;
  createdAt: string;
  status: 'active' | 'closed';
  meetLink?: string;
  participantCount: number;
  durationMinutes?: number;
  enableChat?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  timestamp: string;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  college?: string;
  joinedAt: string;
}

export interface Participation {
  id: string;
  roomId: string;
  roomTitle: string;
  roomSubject: string;
  joinedAt: string;
}

export interface Resource {
  id: string;
  roomId: string;
  title: string;
  url: string;
  addedBy: string;
  addedByName: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  participantNames: { [uid: string]: string };
  lastMessage: string;
  updatedAt: string;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  content: string;
  timestamp: string;
}
