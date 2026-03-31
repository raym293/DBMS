import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function Users() {
  const [users, setUsers] = useState([])
  const [accessControls, setAccessControls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const [usersResult, accessResult] = await Promise.all([
        supabase.from('users').select('*').order('created_at', { ascending: false }),
        supabase.from('access_control').select('*')
      ])

      setUsers(usersResult.data || [])
      setAccessControls(accessResult.data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  function getUserPermissions(userId) {
    return accessControls.filter(ac => ac.user_id === userId)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Users & Access Control</h2>

      {users.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg">No users found.</p>
          <p className="text-gray-400 mt-2">Connect your Supabase instance to see users.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {users.map((user) => {
            const permissions = getUserPermissions(user.id)
            return (
              <div key={user.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-vcs-primary rounded-full flex items-center justify-center text-white text-xl font-bold">
                      {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{user.username}</h3>
                      <p className="text-gray-500 text-sm">{user.email}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role || 'user'}
                  </span>
                </div>

                {permissions.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-600 mb-2">Permissions</h4>
                    <div className="flex flex-wrap gap-2">
                      {permissions.map((perm) => (
                        <span
                          key={perm.id}
                          className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm"
                        >
                          {perm.permission_type}: {perm.resource}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 text-sm text-gray-400">
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
