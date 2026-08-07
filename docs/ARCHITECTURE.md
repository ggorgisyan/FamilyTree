# Architecture Reference

## Firestore Schema

### `members` collection

Each document represents one family member.

```
members/{memberId}
├── id: string                  # same as document ID (e.g. "1.1.1.1")
├── name: string                # display name
├── parentId: string | null     # parent's id; null for root (Movses)
├── location?: string           # e.g. "Paris, France"
├── birthYear?: number          # e.g. 1952
├── bio?: string                # free-text notes
├── photoURL?: string           # base64 data: URL (see Photo storage below)
└── events?: LifeEvent[]        # birth / relocation / marriage / death timeline
```

Each `LifeEvent` has a shared `{ id, type, date? }` shape plus type-specific fields:

```
birth       → place?: string
relocation  → fromPlace?: string, toPlace?: string
marriage    → spouseName?: string, details?: string, spousePhotoURL?: string
death       → place?: string   # burial place
```

`events` is additive: it does not replace `location`/`birthYear`, which remain the quick-reference fields shown in the panel header and search results. See `src/types/index.ts` for the exact TypeScript union.

### Photo storage

Despite the Firebase Storage bucket and `storage.rules` below, photo uploads (profile photo and marriage spouse photo) are **not** stored in Firebase Storage today. `src/services/storageService.ts` compresses the image client-side (longest side ≤ 700px, JPEG quality 0.8) and stores the result as a base64 `data:` URL directly on the `members` document (`photoURL` / `spousePhotoURL`). This keeps things simple for the small size of this dataset but means the Storage bucket and its rules are currently unused, and a member with several marriage photos could approach Firestore's 1MiB per-document limit.

**Firestore rules:**
- Any authenticated user can **read** `members`.
- Only `editor` and `admin` roles can **write** `members`.

---

### `users` collection

Each document represents a registered visitor.

```
users/{uid}
├── uid: string                 # Firebase Auth UID
├── email: string
├── displayName: string
├── photoURL: string            # Google profile photo
├── role: "viewer" | "editor" | "admin"
├── firstVisit: Timestamp
└── lastVisit: Timestamp
```

**Firestore rules:**
- Users can **read** their own document.
- Only `admin` can **read all** and **write** `users`.

---

## Role System

```
viewer  →  (admin promotes)  →  editor
editor  →  (admin demotes)   →  viewer
admin   →  hardcoded by UID in src/firebase.ts (VITE_ADMIN_UID env var)
```

The admin UID is set via the `VITE_ADMIN_UID` environment variable. This prevents any user from self-promoting to admin.

---

## Firebase Storage Structure

```
photos/
└── {memberId}/
    └── profile.jpg     # resized & stored on upload
```

Upload is restricted to authenticated editors and admins (enforced by Storage security rules).

---

## Auth Flow

1. User visits the site → `AuthContext` checks Firebase Auth state.
2. If unauthenticated → `LoginPage` is shown; no family data is fetched.
3. User clicks "Sign in with Google" → Firebase Auth popup.
4. On success → check `users/{uid}` in Firestore:
   - **First visit**: create doc with `role: "viewer"`, set `firstVisit` and `lastVisit`.
   - **Returning**: update `lastVisit` only.
5. `AuthContext` exposes `{ user, role, loading }` to the entire app.
6. Components use `role` to conditionally render edit controls.

---

## Security Rules Overview

### Firestore (`firestore.rules`)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAuth() {
      return request.auth != null;
    }

    function getRole() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role;
    }

    function isEditor() {
      return getRole() in ['editor', 'admin'];
    }

    function isAdmin() {
      return getRole() == 'admin';
    }

    match /members/{memberId} {
      allow read: if isAuth();
      allow write: if isAuth() && isEditor();
    }

    match /users/{uid} {
      allow read: if isAuth() && (request.auth.uid == uid || isAdmin());
      allow create: if isAuth() && request.auth.uid == uid;
      allow update: if isAuth() && (request.auth.uid == uid || isAdmin());
    }
  }
}
```

### Firebase Storage (`storage.rules`)

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/{memberId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
        && firestore.get(/databases/(default)/documents/users/$(request.auth.uid)).data.role in ['editor', 'admin'];
    }
  }
}
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Firebase project API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | e.g. `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | e.g. `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_ADMIN_UID` | Your Firebase Auth UID (hardcodes admin role) |
| `VITE_REPO_NAME` | GitHub repo name for Vite base path (e.g. `FamilyTree`) |

These are stored in `.env.local` for local development and as **GitHub Actions secrets** for CI/CD.
