import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAllUsers, setUserRole } from '../services/firestoreService'
import type { AppUser, Role } from '../types'

export default function AdminPage() {
  const { role, logOut } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<AppUser[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (role !== 'admin') {
      navigate('/')
      return
    }
    getAllUsers().then(u => {
      setUsers(u)
      setLoading(false)
    })
  }, [role, navigate])

  const toggleRole = async (user: AppUser) => {
    const newRole: Role = user.role === 'editor' ? 'viewer' : 'editor'
    await setUserRole(user.uid, newRole)
    setUsers(prev => prev.map(u => u.uid === user.uid ? { ...u, role: newRole } : u))
  }

  const fmt = (iso: string) => iso ? new Date(iso).toLocaleDateString() : '—'

  return (
    <div className="min-h-screen bg-transparent px-4 py-4">
      <div className="max-w-6xl mx-auto">
        <header className="soft-panel rounded-[22px] border border-amber-100 shadow-[0_10px_30px_rgba(120,88,44,0.10)] px-6 py-4 flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-amber-950">Admin Dashboard</h1>
            <p className="text-amber-700 text-sm">Manage visitors and editing permissions</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/')}
              className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2 rounded-full text-sm"
            >
              ← Back to tree
            </button>
            <button
              onClick={logOut}
              className="bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 rounded-full text-sm"
            >
              Sign out
            </button>
          </div>
        </header>

        <main>
          {loading ? (
            <p className="text-stone-500 text-center py-20">Loading users…</p>
          ) : (
            <div className="bg-white/85 rounded-[22px] border border-amber-100 shadow-[0_10px_30px_rgba(120,88,44,0.08)] overflow-x-auto">
              <table className="min-w-full text-sm">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3 text-left">User</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">First visit</th>
                  <th className="px-4 py-3 text-left">Last visit</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.uid} className="hover:bg-gray-50">
                    <td className="px-4 py-3 flex items-center gap-2">
                      <img src={u.photoURL} alt="" className="w-8 h-8 rounded-full" />
                      <span className="font-medium text-gray-800">{u.displayName}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        u.role === 'admin' ? 'bg-red-100 text-red-700' :
                        u.role === 'editor' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{fmt(u.firstVisit)}</td>
                    <td className="px-4 py-3 text-gray-500">{fmt(u.lastVisit)}</td>
                    <td className="px-4 py-3">
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => toggleRole(u)}
                          className={`px-3 py-1 rounded text-xs font-medium transition ${
                            u.role === 'editor'
                              ? 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                              : 'bg-green-100 hover:bg-green-200 text-green-700'
                          }`}
                        >
                          {u.role === 'editor' ? 'Revoke editor' : 'Make editor'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
