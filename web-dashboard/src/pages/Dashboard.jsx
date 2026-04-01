import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// SVG Icons
const DocumentTextIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const BranchIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7a3 3 0 100-6 3 3 0 000 6zm0 0v10m0 0a3 3 0 100 6 3 3 0 000-6zm10-10a3 3 0 100-6 3 3 0 000 6zm0 0v4a2 2 0 01-2 2H9" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

// Loading spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-vcs-border rounded-full animate-spin-slow border-t-vcs-primary"></div>
    </div>
  </div>
)

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
    return <LoadingSpinner />
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-zinc-100 mb-8">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-vcs-surface rounded-xl border border-vcs-border p-6 transition-smooth hover:border-vcs-primary/50 hover:shadow-lg hover:shadow-vcs-primary/10 animate-slide-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Total Commits</p>
              <p className="text-3xl font-bold text-vcs-primary mt-1">{stats.commits}</p>
            </div>
            <div className="text-vcs-primary opacity-80">
              <DocumentTextIcon />
            </div>
          </div>
        </div>
        <div className="bg-vcs-surface rounded-xl border border-vcs-border p-6 transition-smooth hover:border-green-500/50 hover:shadow-lg hover:shadow-green-500/10 animate-slide-up stagger-1">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Branches</p>
              <p className="text-3xl font-bold text-green-500 mt-1">{stats.branches}</p>
            </div>
            <div className="text-green-500 opacity-80">
              <BranchIcon />
            </div>
          </div>
        </div>
        <div className="bg-vcs-surface rounded-xl border border-vcs-border p-6 transition-smooth hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/10 animate-slide-up stagger-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-zinc-400 text-sm">Users</p>
              <p className="text-3xl font-bold text-blue-500 mt-1">{stats.users}</p>
            </div>
            <div className="text-blue-500 opacity-80">
              <UsersIcon />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Commits */}
      <div className="bg-vcs-surface rounded-xl border border-vcs-border p-6 animate-slide-up stagger-3">
        <h3 className="text-xl font-bold text-zinc-100 mb-4">Recent Commits</h3>
        {recentCommits.length === 0 ? (
          <p className="text-zinc-500">No commits yet. Connect your Supabase instance to see data.</p>
        ) : (
          <div className="space-y-4">
            {recentCommits.map((commit, index) => (
              <div 
                key={commit.id} 
                className={`border-l-2 border-vcs-primary pl-4 py-2 transition-smooth hover:border-l-4 hover:bg-vcs-surface-hover rounded-r-lg stagger-${index + 1}`}
              >
                <p className="font-mono text-sm text-vcs-primary">{commit.commit_hash?.slice(0, 7)}</p>
                <p className="text-zinc-200">{commit.message}</p>
                <p className="text-sm text-zinc-500">{commit.author_id} - {new Date(commit.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
