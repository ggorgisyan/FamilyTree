import { initializeApp } from 'firebase/app'
import { getAuth, connectAuthEmulator, signInWithCustomToken } from 'firebase/auth'
import { initializeFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getStorage } from 'firebase/storage'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

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
export const functions = getFunctions(app)

// Route the SDK at the local Firebase Emulator Suite instead of production
// when explicitly opted in (used by the Playwright E2E suite). Default/unset
// behavior is completely unaffected — production never connects here.
if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
  connectFunctionsEmulator(functions, '127.0.0.1', 5001)

  // Test-only hook: lets Playwright sign the browser in via a custom token
  // minted by the Admin SDK (real Google popup sign-in can't be automated).
  // Only ever attached when VITE_USE_FIREBASE_EMULATORS=true, so it never
  // ships in a production build pointed at real Firebase.
  ;(window as unknown as { __testAuth: unknown }).__testAuth = { auth, signInWithCustomToken }
}

export const ADMIN_UID = (import.meta.env.VITE_ADMIN_UID as string | undefined)?.trim() ?? ''
export const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL as string | undefined)?.trim().toLowerCase() ?? ''
export const IS_ADMIN_CONFIGURED = ADMIN_UID.length > 0 || ADMIN_EMAIL.length > 0
