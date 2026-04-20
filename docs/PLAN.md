# Implementation Plan

## Phase 0 — Repo Documentation ✅
- [x] `README.md` — project overview, architecture diagrams, setup guide
- [x] `docs/ARCHITECTURE.md` — Firestore schema, roles, security rules, env vars
- [x] `docs/PLAN.md` — this file

## Phase 1 — Project Scaffold + Firebase Setup
- [x] Init Vite + React + TypeScript project
- [x] Install Tailwind CSS, `react-d3-tree`, `firebase`, `react-router-dom`
- [x] Configure Vite `base` path for GitHub Pages
- [x] Create `.env.example` with all required variables
- [x] Create `src/firebase.ts` — Firebase app initialization
- [x] Create `firestore.rules` and `storage.rules`

## Phase 2 — Auth Layer
- [x] `src/contexts/AuthContext.tsx` — exposes `user`, `role`, `loading`
- [x] `src/pages/LoginPage.tsx` — full-screen Google sign-in
- [x] Route guard: unauthenticated users redirected to login
- [x] On first sign-in: create `users/{uid}` doc with `role: "viewer"`
- [x] On every sign-in: update `lastVisit`

## Phase 3 — Data Layer
- [x] `src/types/index.ts` — `FamilyMember`, `AppUser` TypeScript interfaces
- [x] `src/data/familyTree.json` — all ~80 members seeded from family tree document
- [x] `src/services/firestoreService.ts` — `getMembers()`, `updateMember()`
- [x] `src/services/storageService.ts` — `uploadPhoto()`, `getPhotoURL()`
- [x] `src/scripts/seedFirestore.ts` — one-time Firestore population script

## Phase 4 — Tree Visualization
- [x] `src/components/TreeView.tsx` — react-d3-tree wrapper with zoom/pan
- [x] `src/components/MemberNode.tsx` — circular photo / initials avatar + name label
- [x] Build flat list → nested tree structure for react-d3-tree
- [x] Expand/collapse support

## Phase 5 — Member Detail Panel
- [x] `src/components/MemberPanel.tsx` — slide-in right panel on node click
- [x] Viewer: read-only display of member info
- [x] Editor/Admin: editable fields (location, birth year, bio, photo upload)
- [x] Save → Firestore update + Storage upload

## Phase 6 — Admin Dashboard
- [x] `src/pages/AdminPage.tsx` — route `/admin`, admin-only
- [x] Table: all users, email, display name, role, firstVisit, lastVisit
- [x] Promote/demote button per user row
- [x] Route guard: non-admins redirected to home

## Phase 7 — Polish & Deploy
- [x] Loading spinners and error boundaries
- [x] Responsive layout (mobile/tablet)
- [x] `.github/workflows/deploy.yml` — GitHub Actions → GitHub Pages
- [x] Final smoke test: auth, edit, admin, deploy
