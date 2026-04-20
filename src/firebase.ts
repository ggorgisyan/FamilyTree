import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { initializeFirestore } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyA2qBNtx4C8hawZUg7HskA6W2nS-YeGBLg',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'familytree-4f1af.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'familytree-4f1af',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'familytree-4f1af.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '902399656867',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:902399656867:web:fdebc2c0c7ae8c74491016',
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
})
export const storage = getStorage(app)

export const ADMIN_UID = (import.meta.env.VITE_ADMIN_UID as string | undefined)?.trim() ?? ''
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? ''
export const IS_ADMIN_CONFIGURED = ADMIN_UID.length > 0 || ADMIN_EMAIL.length > 0
