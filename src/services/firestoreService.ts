import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase'
import type { FamilyMember, AppUser, Role } from '../types'

// ── Members ──────────────────────────────────────────────────────────────────

export async function getMembers(): Promise<FamilyMember[]> {
  const snapshot = await getDocs(collection(db, 'members'))
  return snapshot.docs.map(d => d.data() as FamilyMember)
}

export async function updateMember(member: Partial<FamilyMember> & { id: string }): Promise<void> {
  const ref = doc(db, 'members', member.id)

  const sanitized = Object.fromEntries(
    Object.entries(member).filter(([, value]) => value !== undefined)
  )

  await updateDoc(ref, sanitized)
}

// ── Users ─────────────────────────────────────────────────────────────────────

export async function getOrCreateUser(
  uid: string,
  email: string,
  displayName: string,
  photoURL: string,
  adminUid: string,
  adminEmail: string,
): Promise<AppUser> {
  const ref = doc(db, 'users', uid)
  const now = new Date().toISOString()
  const normalizedEmail = email.toLowerCase()
  const isConfiguredAdmin = uid === adminUid || normalizedEmail === adminEmail

  const fallbackRole: Role = isConfiguredAdmin ? 'admin' : 'viewer'
  const fallbackUser: AppUser = {
    uid,
    email,
    displayName,
    photoURL,
    role: fallbackRole,
    firstVisit: now,
    lastVisit: now,
  }

  try {
    const snap = await getDoc(ref)
    const existingData = snap.exists() ? snap.data() : null
    const role: Role = isConfiguredAdmin ? 'admin' : (existingData?.role as Role | undefined) ?? 'viewer'

    await setDoc(ref, {
      uid,
      email,
      displayName,
      photoURL,
      role,
      firstVisit: existingData?.firstVisit ?? serverTimestamp(),
      lastVisit: serverTimestamp(),
    }, { merge: true })

    return {
      uid,
      email,
      displayName,
      photoURL,
      role,
      firstVisit: existingData?.firstVisit instanceof Timestamp
        ? existingData.firstVisit.toDate().toISOString()
        : now,
      lastVisit: now,
    }
  } catch {
    return fallbackUser
  }
}

export async function getAllUsers(): Promise<AppUser[]> {
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map(d => {
    const data = d.data()
    return {
      ...data,
      firstVisit: (data.firstVisit as Timestamp)?.toDate().toISOString() ?? '',
      lastVisit: (data.lastVisit as Timestamp)?.toDate().toISOString() ?? '',
    } as AppUser
  })
}

export async function setUserRole(uid: string, role: Role): Promise<void> {
  await updateDoc(doc(db, 'users', uid), { role })
}
