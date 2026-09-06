import { useEffect, useMemo, useRef, useState } from 'react'
import { BrowserRouter, Routes, Route, useNavigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './pages/LoginPage'
import AdminPage from './pages/AdminPage'
import TreeView from './components/TreeView'
import type { TreeViewHandle } from './components/TreeView'
import MemberPanel from './components/MemberPanel'
import ChatBot from './components/ChatBot'
import { getMembers } from './services/firestoreService'
import { IS_ADMIN_CONFIGURED } from './firebase'
import builtInMembers from './data/familyTree.json'
import { avatarGradient, genName, initials } from './utils/style'
import type { FamilyMember } from './types'

function TreeApp() {
  const { user, role, loading, logOut, authError } = useAuth()
  const navigate = useNavigate()
  const treeRef = useRef<TreeViewHandle>(null)
  const searchRef = useRef<HTMLDivElement>(null)

  const [members, setMembers] = useState<FamilyMember[]>([])
  const [membersMap, setMembersMap] = useState<Map<string, FamilyMember>>(new Map())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dataWarning, setDataWarning] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!user) return
    let cancelled = false

    const applyMembers = (data: FamilyMember[]) => {
      if (cancelled) return
      setMembers(data)
      setMembersMap(new Map(data.map(m => [m.id, m])))
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
      .catch(error => {
        if (cancelled) return
        const message = error instanceof Error ? error.message.toLowerCase() : ''
        if (message.includes('permission') || message.includes('insufficient')) {
          setDataWarning('Cloud database access is blocked by Firestore rules. Publishing the rules in Firebase Console will switch the app to cloud data.')
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

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setQuery('')
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])

  const handleMemberUpdated = (updated: FamilyMember) => {
    setMembers(prev => prev.map(m => (m.id === updated.id ? updated : m)))
    setMembersMap(prev => new Map(prev).set(updated.id, updated))
  }

  const depthOf = (m: FamilyMember) => {
    let d = 0
    let cur: FamilyMember | undefined = m
    while (cur && cur.parentId) {
      d++
      cur = membersMap.get(cur.parentId)
    }
    return d
  }

  const goToMember = (id: string) => {
    setSelectedId(id)
    treeRef.current?.focusMember(id)
    setQuery('')
  }

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return members.filter(m => m.name.toLowerCase().includes(q)).slice(0, 12)
  }, [query, members])

  if (loading) {
    return <div className="center-screen">Loading…</div>
  }

  if (!user) return <LoginPage />

  const selectedMember = selectedId
    ? membersMap.get(selectedId) ?? members.find(m => m.id === selectedId) ?? null
    : null

  return (
    <div className="app-shell">
      <div className="topbar">
        <div className="mini-crest">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22V12" /><circle cx="12" cy="7" r="4" />
            <path d="M5 22v-3a3 3 0 0 1 3-3h1" /><path d="M19 22v-3a3 3 0 0 0-3-3h-1" />
          </svg>
        </div>
        <div className="brand">
          <div className="t">Gorguissian Family</div>
          <div className="s">Explore &amp; preserve your history</div>
        </div>

        <div className="search" ref={searchRef}>
          <svg className="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="text"
            placeholder="Search a family member…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            autoComplete="off"
          />
          {query.trim() && (
            <div className="results">
              {results.length ? (
                results.map(m => (
                  <button key={m.id} onClick={() => goToMember(m.id)}>
                    <span
                      style={{
                        width: 30, height: 30, borderRadius: '50%', color: '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 800, background: avatarGradient(m.name),
                      }}
                    >
                      {initials(m.name)}
                    </span>
                    <span>
                      <span className="rn">{m.name}</span>
                      <br />
                      <span className="rm">
                        {genName(depthOf(m))}{m.location ? ` · ${m.location}` : ''}
                      </span>
                    </span>
                  </button>
                ))
              ) : (
                <div className="empty">No matches</div>
              )}
            </div>
          )}
        </div>

        <div className="spacer" />

        <div className="tools">
          <button className="tbtn" onClick={() => treeRef.current?.expandAll()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" /></svg>
            <span>Expand all</span>
          </button>
          <button className="tbtn" onClick={() => treeRef.current?.collapseDeep()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 9H5m4 0V5m6 4h4m-4 0V5M9 15H5m4 0v4m6-4h4m-4 0v4" /></svg>
            <span>Collapse</span>
          </button>
          <button className="tbtn solid" onClick={() => treeRef.current?.fitView()}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 8V5a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" /></svg>
            <span>Fit</span>
          </button>
        </div>

        <div className="user">
          <div className="uav">
            {user.photoURL ? <img src={user.photoURL} alt="" /> : initials(user.displayName ?? 'Me')}
          </div>
          <div>
            <div className="uname">{user.displayName ?? 'You'}</div>
            <div className="urole">{role ?? 'viewer'}</div>
          </div>
          {role === 'admin' && (
            <button className="tbtn icobtn" title="Admin dashboard" onClick={() => navigate('/admin')} style={{ marginLeft: 6 }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" /></svg>
            </button>
          )}
          <button className="tbtn icobtn" title="Sign out" onClick={logOut} style={{ marginLeft: 6 }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></svg>
          </button>
        </div>
      </div>

      {!IS_ADMIN_CONFIGURED && (
        <div className="banner warn">
          Admin is not configured yet. Add your UID or Gmail address to .env.local.
          {user?.uid ? <strong> UID: {user.uid}</strong> : null}
          {user?.email ? <strong> · Email: {user.email}</strong> : null}
        </div>
      )}
      {authError && user && <div className="banner err">{authError}</div>}
      {dataWarning && <div className="banner info">{dataWarning}</div>}

      <div className="chips">
        <span className="chip"><span className="dot" style={{ background: 'var(--brass)' }} /><b>{members.length}</b>&nbsp;members</span>
        <span className="chip"><span className="dot" style={{ background: 'var(--pine)' }} />7 generations</span>
        <span className="chip">Role: <b style={{ textTransform: 'capitalize' }}>{role}</b></span>
        <span className="chip">Drag to pan · scroll to zoom · click a card to open</span>
      </div>

      <TreeView members={members} selectedId={selectedId} onSelect={setSelectedId} ref={treeRef} />

      {selectedMember && role && (
        <MemberPanel
          member={selectedMember}
          role={role}
          membersMap={membersMap}
          onClose={() => setSelectedId(null)}
          onUpdated={handleMemberUpdated}
          onNavigate={goToMember}
        />
      )}

      <ChatBot membersMap={membersMap} onNavigate={goToMember} />
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
