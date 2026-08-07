import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAllUsers, setUserRole } from '../services/firestoreService'
import { initials } from '../utils/style'
import type { AppUser, Role } from '../types'

export default function AdminPage() {
  const { role, logOut } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/')
      return
    }
    getAllUsers()
      .then(u => setUsers(u))
      .catch(() => setErrorMessage('Could not load users. Check your connection and try again.'))
      .finally(() => setLoading(false))
  }, [role, navigate])

  const toggleRole = async (user: AppUser) => {
    const newRole: Role = user.role === 'editor' ? 'viewer' : 'editor'
    try {
      await setUserRole(user.uid, newRole)
      setUsers(prev => prev.map(u => (u.uid === user.uid ? { ...u, role: newRole } : u)))
    } catch {
      setErrorMessage(`Could not update ${user.displayName || user.email}'s role. Try again.`)
    }
  }

  const fmt = (iso: string) => (iso ? new Date(iso).toLocaleDateString() : '—')

  const roleColors: Record<string, { bg: string; fg: string }> = {
    admin: { bg: '#f0e4cd', fg: '#7a5510' },
    editor: { bg: '#e2efe8', fg: '#1f4d3f' },
    viewer: { bg: '#efe8db', fg: '#6d665a' },
  }

  return (
    <div style={{ minHeight: '100vh', padding: '18px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div className="topbar" style={{ borderRadius: 18, border: '1px solid var(--line)', marginBottom: 18, boxShadow: 'var(--shadow-sm)' }}>
          <div className="mini-crest">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22V12" /><circle cx="12" cy="7" r="4" />
              <path d="M5 22v-3a3 3 0 0 1 3-3h1" /><path d="M19 22v-3a3 3 0 0 0-3-3h-1" />
            </svg>
          </div>
          <div className="brand">
            <div className="t">Admin dashboard</div>
            <div className="s">Manage visitors and editing permissions</div>
          </div>
          <div className="spacer" />
          <button className="tbtn" onClick={() => navigate('/')}>← Back to tree</button>
          <button className="tbtn solid" onClick={logOut}>Sign out</button>
        </div>

        {errorMessage && (
          <div style={{ background: '#fbeceb', color: '#8a2e22', borderRadius: 14, padding: '10px 16px', fontSize: 13, marginBottom: 18 }}>
            {errorMessage}
          </div>
        )}

        {loading ? (
          <p style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink-soft)' }}>Loading users…</p>
        ) : (
          <div style={{ background: 'var(--surface)', borderRadius: 18, border: '1px solid var(--line)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ background: 'var(--surface-2)', color: 'var(--ink-faint)', textTransform: 'uppercase', fontSize: 11, letterSpacing: '.06em' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>User</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Email</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Role</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>First visit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Last visit</th>
                  <th style={{ padding: '12px 16px', textAlign: 'left' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const rc = roleColors[u.role] ?? roleColors.viewer
                  return (
                    <tr key={u.uid} style={{ borderTop: '1px solid var(--line-soft)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span className="uav" style={{ width: 30, height: 30 }}>
                            {u.photoURL ? <img src={u.photoURL} alt="" /> : initials(u.displayName || 'U')}
                          </span>
                          <span style={{ fontWeight: 700 }}>{u.displayName}</span>
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-soft)' }}>{u.email}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ background: rc.bg, color: rc.fg, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, textTransform: 'capitalize' }}>
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-faint)' }}>{fmt(u.firstVisit)}</td>
                      <td style={{ padding: '12px 16px', color: 'var(--ink-faint)' }}>{fmt(u.lastVisit)}</td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.role !== 'admin' && (
                          <button className="tbtn" onClick={() => toggleRole(u)}>
                            {u.role === 'editor' ? 'Revoke editor' : 'Make editor'}
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
