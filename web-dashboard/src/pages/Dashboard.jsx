import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function Dashboard() {
  const [stats, setStats] = useState({
    commits: 0,
    branches: 0,
    users: 0
  })
  const [recentCommits, setRecentCommits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      // Fetch commit count
      const { count: commitCount } = await supabase
        .from('commits')
        .select('*', { count: 'exact', head: true })

      // Fetch branch count
      const { count: branchCount } = await supabase
        .from('branches')
        .select('*', { count: 'exact', head: true })

      // Fetch user count
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })

      // Fetch recent commits
      const { data: commits } = await supabase
        .from('commits')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)

      setStats({
        commits: commitCount || 0,
        branches: branchCount || 0,
        users: userCount || 0
      })
      setRecentCommits(commits || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
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
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Commits</p>
              <p className="text-3xl font-bold text-vcs-primary">{stats.commits}</p>
            </div>
            <div className="text-4xl">📝</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Branches</p>
              <p className="text-3xl font-bold text-green-600">{stats.branches}</p>
            </div>
            <div className="text-4xl">🌿</div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Users</p>
              <p className="text-3xl font-bold text-blue-600">{stats.users}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
      </div>

      {/* Recent Commits */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">Recent Commits</h3>
        {recentCommits.length === 0 ? (
          <p className="text-gray-500">No commits yet. Connect your Supabase instance to see data.</p>
        ) : (
          <div className="space-y-4">
            {recentCommits.map((commit) => (
              <div key={commit.id} className="border-l-4 border-vcs-primary pl-4 py-2">
                <p className="font-mono text-sm text-gray-600">{commit.commit_hash?.slice(0, 7)}</p>
                <p className="text-gray-800">{commit.message}</p>
                <p className="text-sm text-gray-500">{commit.author_id} • {new Date(commit.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
