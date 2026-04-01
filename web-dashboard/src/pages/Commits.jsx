import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

// Loading spinner
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <div className="relative">
      <div className="w-12 h-12 border-4 border-vcs-border rounded-full animate-spin-slow border-t-vcs-primary"></div>
    </div>
  </div>
)

function Commits() {
  const [commits, setCommits] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCommits()
  }, [])

  async function fetchCommits() {
    try {
      const { data, error } = await supabase
        .from('commits')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setCommits(data || [])
    } catch (error) {
      console.error('Error fetching commits:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-zinc-100 mb-8">Commit History</h2>

      {commits.length === 0 ? (
        <div className="bg-vcs-surface rounded-xl border border-vcs-border p-8 text-center">
          <p className="text-zinc-400 text-lg">No commits found.</p>
          <p className="text-zinc-500 mt-2">Connect your Supabase instance to see commit history.</p>
        </div>
      ) : (
        <div className="bg-vcs-surface rounded-xl border border-vcs-border overflow-hidden animate-slide-up">
          <table className="min-w-full divide-y divide-vcs-border">
            <thead className="bg-vcs-dark">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Hash
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider">
                  Parent
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-vcs-border">
              {commits.map((commit, index) => (
                <tr 
                  key={commit.id} 
                  className="transition-smooth hover:bg-vcs-surface-hover"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-vcs-primary">
                      {commit.commit_hash?.slice(0, 7)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-zinc-200">{commit.message}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-zinc-400">{commit.author_id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-zinc-500 text-sm">
                      {new Date(commit.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-zinc-600">
                      {commit.parent_hash?.slice(0, 7) || '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default Commits
