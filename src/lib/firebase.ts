import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Placeholder configuration. The user needs to provide their actual config.
// Since the automatic setup failed due to a permission error, please replace this
// with your actual Firebase project configuration from the Firebase Console.
const firebaseConfig = {
  apiKey: "AIzaSyBMQ3fruz4XU2g1zYRcorOilav-Tq6C1iQ",
  authDomain: "derma-care-7be93.firebaseapp.com",
  projectId: "derma-care-7be93",
  storageBucket: "derma-care-7be93.firebasestorage.app",
  messagingSenderId: "524837708343",
  appId: "1:524837708343:web:6b68a43d185dff192215b2"
};

// Initialize Firebase SDK
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
