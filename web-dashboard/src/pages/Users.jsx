import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuthz } from '../context/AuthzContext.jsx'
import AccessDenied from '../components/AccessDenied.jsx'

// Loading spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-vcs-border rounded-full animate-spin-slow border-t-vcs-primary"></div>
    </div>
  </div>
)

function Users() {
  const { canView } = useAuthz()
  const [users, setUsers] = useState([])
  const [accessControls, setAccessControls] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const canAccess = canView('users')

  useEffect(() => {
    if (!canAccess) {
      setLoading(false)
      return
    }
    fetchData()
  }, [canAccess])

  async function fetchData() {
    try {
      const [usersResult, accessResult] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('access_control').select('*')
      ])

      if (usersResult.error) throw usersResult.error
      if (accessResult.error) throw accessResult.error

      setUsers(usersResult.data || [])
      setAccessControls(accessResult.data || [])
      setErrorMessage(null)
    } catch (error) {
      console.error('Error fetching data:', error)
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  function getUserPermissions(userId) {
    return accessControls.filter(ac => ac.user_id === userId)
  }

  if (loading) {
    return <LoadingSpinner />
  }

  if (!canAccess) {
    return <AccessDenied message='Only administrators can view users and access control.' />
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-zinc-100 mb-8">Users & Access Control</h2>

      {errorMessage && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      {users.length === 0 ? (
        <div className="bg-vcs-surface rounded-xl border border-vcs-border p-8 text-center">
          <p className="text-zinc-400 text-lg">No users found.</p>
          <p className="text-zinc-500 mt-2">Connect your Supabase instance to see users.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {users.map((user, index) => {
            const permissions = getUserPermissions(user.id)
            return (
              <div 
                key={user.id} 
                className="bg-vcs-surface rounded-xl border border-vcs-border p-6 transition-smooth hover:border-vcs-primary/50 hover:shadow-lg hover:shadow-vcs-primary/5 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-vcs-primary to-vcs-secondary rounded-full flex items-center justify-center text-white text-xl font-bold shadow-lg shadow-vcs-primary/25">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-zinc-100">{user.username}</h3>
                      <p className="text-zinc-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm border ${
                    user.role === 'admin' 
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                      : 'bg-blue-500/20 text-blue-400 border-blue-500/30'
                  }`}>
                    {user.role || 'user'}
                  </span>
                </div>

                {permissions.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-vcs-border">
                    <h4 className="text-sm font-medium text-zinc-500 mb-2">Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {permissions.map((perm) => (
                        <span
                          key={perm.id}
                          className="bg-vcs-surface-hover text-zinc-300 px-3 py-1 rounded-full text-sm border border-vcs-border transition-smooth hover:border-zinc-500"
                        >
                          {perm.permission_type}: {perm.resource}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 text-sm text-zinc-600">
                  Joined: {new Date(user.created_at).toLocaleDateString()}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Users
