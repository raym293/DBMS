import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

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
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Commit History</h2>

      {commits.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg">No commits found.</p>
          <p className="text-gray-400 mt-2">Connect your Supabase instance to see commit history.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Hash
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Author
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {commits.map((commit) => (
                <tr key={commit.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-vcs-primary">
                      {commit.commit_hash?.slice(0, 7)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-gray-900">{commit.message}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-600">{commit.author_id}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-gray-500 text-sm">
                      {new Date(commit.created_at).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-mono text-sm text-gray-400">
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
