import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut, GoogleAuthProvider } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth, ADMIN_EMAIL, ADMIN_UID } from '../firebase'
import { getOrCreateUser } from '../services/firestoreService'
import type { Role } from '../types'

interface AuthContextValue {
  user: User | null
  role: Role | null
  loading: boolean
  authError: string | null
  signIn: () => Promise<void>
  logOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)
const provider = new GoogleAuthProvider()

function formatFirebaseError(error: unknown): string {
  const code = typeof error === 'object' && error && 'code' in error ? String(error.code) : ''

  switch (code) {
    case 'auth/popup-closed-by-user':
      return 'The Google sign-in popup was closed before completing login.'
    case 'auth/popup-blocked':
      return 'Your browser blocked the sign-in popup. Please allow popups for localhost.'
    case 'auth/unauthorized-domain':
      return 'This domain is not authorized in Firebase. Add localhost in Firebase Authentication > Settings > Authorized domains.'
    case 'auth/operation-not-allowed':
      return 'Google sign-in is not enabled in Firebase Authentication. Enable the Google provider in the Firebase console.'
    case 'auth/configuration-not-found':
      return 'Firebase Authentication is not fully configured for Google sign-in. In Firebase Console, open Authentication, click Get started if needed, then enable the Google provider and choose a support email.'
    case 'permission-denied':
      return 'Firestore access is blocked. Create the Firestore database and publish the security rules.'
    default: {
      const message = error instanceof Error ? error.message : 'Authentication failed. Please check your Firebase setup.'
      if (message.toLowerCase().includes('offline')) {
        return 'Cloud sync is temporarily unavailable. You are signed in, and the app will continue using local data.'
      }
      return message
    }
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState<string | null>(null)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async firebaseUser => {
      try {
        if (firebaseUser) {
          const appUser = await getOrCreateUser(
            firebaseUser.uid,
            firebaseUser.email ?? '',
            firebaseUser.displayName ?? '',
            firebaseUser.photoURL ?? '',
            ADMIN_UID,
            ADMIN_EMAIL,
          )
          setUser(firebaseUser)
          setRole(appUser.role)
          setAuthError(null)
        } else {
          setUser(null)
          setRole(null)
        }
      } catch (error) {
        if (firebaseUser) {
          const isAdmin = (ADMIN_UID && firebaseUser.uid === ADMIN_UID) || (ADMIN_EMAIL && (firebaseUser.email ?? '').toLowerCase() === ADMIN_EMAIL)
          setUser(firebaseUser)
          setRole(isAdmin ? 'admin' : 'viewer')
        }
        setAuthError(formatFirebaseError(error))
      } finally {
        setLoading(false)
      }
    })
    return unsub
  }, [])

  const signIn = async () => {
    try {
      setAuthError(null)
      await signInWithPopup(auth, provider)
    } catch (error) {
      setAuthError(formatFirebaseError(error))
    }
  }

  const logOut = async () => {
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, authError, signIn, logOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
