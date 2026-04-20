/**
 * One-time Firestore seed script using Firebase Admin SDK.
 *
 * Usage:
 * FIREBASE_SERVICE_ACCOUNT_PATH=/absolute/path/to/service-account.json npm run seed
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { config } from 'dotenv'
import { cert, getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

config({ path: resolve(process.cwd(), '.env.local') })

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
if (!serviceAccountPath) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_PATH is not set. Point it to your downloaded Firebase service account JSON file.')
}

const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'))

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  })
}

const db = getFirestore()
const __dirname = fileURLToPath(new URL('.', import.meta.url))
const dataPath = resolve(__dirname, '../data/familyTree.json')
const members = JSON.parse(readFileSync(dataPath, 'utf-8')) as Array<{
  id: string
  name: string
  parentId: string | null
}>

async function seed() {
  console.log(`Seeding ${members.length} family members to Firestore...`)

  for (const member of members) {
    await db.collection('members').doc(member.id).set(member, { merge: true })
  }

  const adminEmail = (process.env.VITE_ADMIN_EMAIL || '').trim().toLowerCase()
  if (adminEmail) {
    const matchingUsers = await db.collection('users').where('email', '==', adminEmail).get()
    for (const userDoc of matchingUsers.docs) {
      await userDoc.ref.set({
        role: 'admin',
        email: adminEmail,
        lastVisit: FieldValue.serverTimestamp(),
      }, { merge: true })
    }
    console.log(`Admin role synced for ${matchingUsers.size} user record(s).`)
  }

  console.log('Seed completed successfully.')
}

seed().catch(error => {
  console.error('Seed failed:', error)
  process.exit(1)
})