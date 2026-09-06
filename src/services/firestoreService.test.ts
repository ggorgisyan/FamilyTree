import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { getDocs, getDoc, setDoc, updateDoc, collection, doc, serverTimestamp, FakeTimestamp } = vi.hoisted(() => {
  class FakeTimestamp {
    iso: string
    constructor(iso: string) {
      this.iso = iso
    }
    toDate() {
      return new Date(this.iso)
    }
  }

  return {
    getDocs: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    updateDoc: vi.fn(),
    collection: vi.fn((_db: unknown, name: string) => ({ __collection: name })),
    doc: vi.fn((_db: unknown, coll: string, id: string) => ({ __doc: `${coll}/${id}` })),
    serverTimestamp: vi.fn(() => '__serverTimestamp__'),
    FakeTimestamp,
  }
})

vi.mock('firebase/firestore', () => ({
  collection: (...args: unknown[]) => collection(...(args as [unknown, string])),
  doc: (...args: unknown[]) => doc(...(args as [unknown, string, string])),
  getDocs: (...args: unknown[]) => getDocs(...args),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
  updateDoc: (...args: unknown[]) => updateDoc(...args),
  serverTimestamp: () => serverTimestamp(),
  Timestamp: FakeTimestamp,
}))

vi.mock('../firebase', () => ({
  db: {},
}))

import { Timestamp } from 'firebase/firestore'
import {
  getMembers,
  updateMember,
  getOrCreateUser,
  getAllUsers,
  setUserRole,
} from './firestoreService'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getMembers', () => {
  it('maps Firestore docs to FamilyMember objects', async () => {
    getDocs.mockResolvedValue({
      docs: [
        { data: () => ({ id: 'a', name: 'Alice', parentId: null }) },
        { data: () => ({ id: 'b', name: 'Bob', parentId: 'a' }) },
      ],
    })

    const members = await getMembers()

    expect(collection).toHaveBeenCalledWith({}, 'members')
    expect(members).toEqual([
      { id: 'a', name: 'Alice', parentId: null },
      { id: 'b', name: 'Bob', parentId: 'a' },
    ])
  })
})

describe('updateMember', () => {
  it('strips undefined fields before calling updateDoc', async () => {
    await updateMember({ id: 'a', location: 'Yerevan', birthYear: undefined, bio: undefined })

    expect(doc).toHaveBeenCalledWith({}, 'members', 'a')
    expect(updateDoc).toHaveBeenCalledTimes(1)
    const [, sanitized] = updateDoc.mock.calls[0]
    expect(sanitized).toEqual({ id: 'a', location: 'Yerevan' })
    expect(sanitized).not.toHaveProperty('birthYear')
    expect(sanitized).not.toHaveProperty('bio')
  })

  it('keeps falsy-but-defined fields such as empty string or false', async () => {
    await updateMember({ id: 'a', bio: '', isPublicFigure: false })

    const [, sanitized] = updateDoc.mock.calls[0]
    expect(sanitized).toEqual({ id: 'a', bio: '', isPublicFigure: false })
  })
})

describe('getOrCreateUser', () => {
  const uid = 'user-1'
  const email = 'Someone@Example.com'
  const displayName = 'Someone'
  const photoURL = 'https://example.com/p.png'

  it('assigns viewer role to a brand-new, non-admin user', async () => {
    getDoc.mockResolvedValue({ exists: () => false, data: () => null })
    setDoc.mockResolvedValue(undefined)

    const user = await getOrCreateUser(uid, email, displayName, photoURL, 'other-uid', 'other@example.com')

    expect(user.role).toBe('viewer')
    expect(setDoc).toHaveBeenCalledWith(
      { __doc: `users/${uid}` },
      expect.objectContaining({ role: 'viewer' }),
      { merge: true },
    )
  })

  it('assigns admin role when uid matches adminUid', async () => {
    getDoc.mockResolvedValue({ exists: () => false, data: () => null })
    setDoc.mockResolvedValue(undefined)

    const user = await getOrCreateUser(uid, email, displayName, photoURL, uid, 'other@example.com')

    expect(user.role).toBe('admin')
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: 'admin' }),
      { merge: true },
    )
  })

  it('assigns admin role when email matches adminEmail (case-insensitive)', async () => {
    getDoc.mockResolvedValue({ exists: () => false, data: () => null })
    setDoc.mockResolvedValue(undefined)

    const user = await getOrCreateUser(uid, email, displayName, photoURL, 'other-uid', 'someone@example.com')

    expect(user.role).toBe('admin')
  })

  it('keeps the existing role for a returning non-admin user', async () => {
    getDoc.mockResolvedValue({ exists: () => true, data: () => ({ role: 'editor', firstVisit: null }) })
    setDoc.mockResolvedValue(undefined)

    const user = await getOrCreateUser(uid, email, displayName, photoURL, 'other-uid', 'other@example.com')

    expect(user.role).toBe('editor')
    expect(setDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ role: 'editor' }),
      { merge: true },
    )
  })

  it('always calls setDoc with merge: true', async () => {
    getDoc.mockResolvedValue({ exists: () => false, data: () => null })
    setDoc.mockResolvedValue(undefined)

    await getOrCreateUser(uid, email, displayName, photoURL, 'other-uid', 'other@example.com')

    expect(setDoc).toHaveBeenCalledTimes(1)
    expect(setDoc.mock.calls[0][2]).toEqual({ merge: true })
  })

  it('preserves firstVisit as an ISO string when it is a Timestamp', async () => {
    const fixed = new Date('2020-01-01T00:00:00.000Z')
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ role: 'viewer', firstVisit: new FakeTimestamp(fixed.toISOString()) }),
    })
    setDoc.mockResolvedValue(undefined)

    const user = await getOrCreateUser(uid, email, displayName, photoURL, 'other-uid', 'other@example.com')

    expect(user.firstVisit).toBe(fixed.toISOString())
  })

  it('returns a fallback user with the resolved role if Firestore access throws', async () => {
    getDoc.mockRejectedValue(new Error('permission-denied'))

    const user = await getOrCreateUser(uid, email, displayName, photoURL, uid, 'other@example.com')

    expect(user.role).toBe('admin')
    expect(user.uid).toBe(uid)
    expect(setDoc).not.toHaveBeenCalled()
  })
})

describe('getAllUsers', () => {
  it('converts Timestamp fields to ISO strings', async () => {
    const first = new Date('2019-05-01T00:00:00.000Z')
    const last = new Date('2024-05-01T00:00:00.000Z')
    getDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            uid: 'u1',
            email: 'u1@example.com',
            displayName: 'U1',
            photoURL: '',
            role: 'viewer',
            firstVisit: new FakeTimestamp(first.toISOString()),
            lastVisit: new FakeTimestamp(last.toISOString()),
          }),
        },
      ],
    })

    const users = await getAllUsers()

    expect(collection).toHaveBeenCalledWith({}, 'users')
    expect(users).toEqual([
      expect.objectContaining({
        uid: 'u1',
        firstVisit: first.toISOString(),
        lastVisit: last.toISOString(),
      }),
    ])
  })

  it('falls back to empty string when a timestamp field is missing', async () => {
    getDocs.mockResolvedValue({
      docs: [{ data: () => ({ uid: 'u2', role: 'viewer' }) }],
    })

    const users = await getAllUsers()

    expect(users[0].firstVisit).toBe('')
    expect(users[0].lastVisit).toBe('')
  })
})

describe('setUserRole', () => {
  it('calls updateDoc with the given role', async () => {
    await setUserRole('user-1', 'editor')

    expect(doc).toHaveBeenCalledWith({}, 'users', 'user-1')
    expect(updateDoc).toHaveBeenCalledWith({ __doc: 'users/user-1' }, { role: 'editor' })
  })
})

// Sanity check that our FakeTimestamp stands in for the real Timestamp class used by `instanceof`.
describe('Timestamp mock wiring', () => {
  it('is the FakeTimestamp class', () => {
    expect(Timestamp).toBe(FakeTimestamp)
  })
})
