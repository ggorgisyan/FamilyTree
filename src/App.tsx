import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import TreeView from './components/TreeView'
import MemberPanel from './components/MemberPanel'
import { getMembers } from './services/firestoreService'
import { buildTree } from './utils/buildTree'
import { IS_ADMIN_CONFIGURED } from './firebase'
import builtInMembers from './data/familyTree.json'
import type { FamilyMember, TreeNodeDatum } from './types'

function TreeApp() {
  const { user, role, loading, logOut, authError } = useAuth()
  const navigate = useNavigate()

  const [members, setMembers] = useState<FamilyMember[]>([])
  const [treeData, setTreeData] = useState<TreeNodeDatum | null>(null)
  const [membersMap, setMembersMap] = useState<Map<string, FamilyMember>>(new Map())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataLoading, setDataLoading] = useState(true)
  const [dataWarning, setDataWarning] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    let cancelled = false

    const applyMembers = (data: FamilyMember[]) => {
      if (cancelled) return
      setMembers(data)
      const map = new Map(data.map(m => [m.id, m]))
      setMembersMap(map)
      setTreeData(buildTree(data))
      setDataLoading(false)
    }

    applyMembers(builtInMembers as FamilyMember[])
    setDataWarning('Loading the local family tree now. Cloud sync will update it when Firestore is ready.')

    getMembers()
      .then(data => {
        if (cancelled) return

        if (data.length > 0) {
          setDataWarning(null)
          applyMembers(data)
        } else {
          setDataWarning('Cloud database is still empty. Showing the local family tree for now.')
        }
      })
      .catch((error) => {
        if (cancelled) return

        const message = error instanceof Error ? error.message.toLowerCase() : ''

        if (message.includes('permission') || message.includes('insufficient')) {
          setDataWarning('Cloud database access is blocked by Firestore rules. Publishing the rules in Firebase Console will switch the app from local data to cloud data.')
        } else if (message.includes('offline')) {
          setDataWarning('Cloud sync is temporarily unavailable. Showing the local family tree so the site stays fast.')
        } else {
          setDataWarning('Cloud sync is not ready yet. Showing the local family tree so the site stays fast.')
        }
      })

    return () => {
      cancelled = true
    }
  }, [user])

  const handleMemberUpdated = (updated: FamilyMember) => {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m))
    setMembersMap(prev => new Map(prev).set(updated.id, updated))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-amber-700 text-lg">Loading…</div>
      </div>
    )
  }

  if (!user) return <LoginPage />

  return (
    <div className="flex flex-col h-screen bg-transparent">
      <header className="px-4 pt-4 pb-2 z-10 flex-shrink-0">
        <div className="soft-panel rounded-[22px] border border-amber-100 shadow-[0_10px_30px_rgba(120,88,44,0.10)] px-5 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl tracking-tight text-amber-950">🌳 Gorguissian Family Tree</h1>
            <p className="text-sm text-amber-700">Explore, update, and preserve your family history</p>
          </div>
          <div className="flex items-center gap-3">
            {role === 'admin' && (
              <button
                onClick={() => navigate('/admin')}
                className="bg-amber-100 hover:bg-amber-200 text-amber-900 text-sm px-3 py-1.5 rounded-full transition font-medium"
              >
                Admin
              </button>
            )}
            <img src={user.photoURL ?? ''} alt="" className="w-9 h-9 rounded-full border-2 border-amber-300" />
            <span className="text-sm text-amber-900 hidden sm:block font-medium">{user.displayName}</span>
            <button
              onClick={logOut}
              className="text-sm bg-rose-500 hover:bg-rose-600 text-white px-3 py-1.5 rounded-full transition"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {!IS_ADMIN_CONFIGURED && (
        <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2 text-sm text-yellow-800">
          Admin is not configured yet. Add your UID or your Gmail address to .env.local.
          {user?.uid ? <span className="ml-2 font-semibold">UID: {user.uid}</span> : null}
          {user?.email ? <span className="ml-2 font-semibold">Email: {user.email}</span> : null}
        </div>
      )}

      {authError && user && (
        <div className="bg-red-50 border-b border-red-200 px-4 py-2 text-sm text-red-800">
          {authError}
        </div>
      )}

      {dataWarning && (
        <div className="mx-4 mt-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-2 text-sm text-blue-800 shadow-sm">
          {dataWarning}
        </div>
      )}

      <div className="mx-4 mt-2 flex flex-wrap items-center gap-2 text-xs text-amber-900">
        <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm border border-amber-100">
          {members.length} family members
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm border border-amber-100">
          Role: {role}
        </span>
        <span className="rounded-full bg-white/80 px-3 py-1 shadow-sm border border-amber-100">
          Drag to move • Scroll to zoom • Click any node to edit • Use + or − to expand branches
        </span>
      </div>

      {/* Tree canvas */}
      <div className="flex-1 relative overflow-hidden">
        {dataLoading ? (
          <div className="flex items-center justify-center h-full text-amber-700">
            Loading family tree…
          </div>
        ) : treeData ? (
          <TreeView
            treeData={treeData}
            membersMap={membersMap}
            onSelectMember={setSelectedId}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            No family data found. Run the seed script first.
          </div>
        )}

        {/* Member panel overlay */}
        {selectedId && role && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setSelectedId(null)}
            />
            <MemberPanel
              member={membersMap.get(selectedId) ?? members.find(m => m.id === selectedId)!}
              role={role}
              onClose={() => setSelectedId(null)}
              onUpdated={handleMemberUpdated}
            />
          </>
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<TreeApp />} />
          <Route path="/admin" element={<AdminPage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
