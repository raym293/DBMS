import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase.js'

function Branches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBranches()
  }, [])

  async function fetchBranches() {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setBranches(data || [])
    } catch (error) {
      console.error('Error fetching branches:', error)
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
      <h2 className="text-3xl font-bold text-gray-800 mb-8">Branches</h2>

      {branches.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <p className="text-gray-500 text-lg">No branches found.</p>
          <p className="text-gray-400 mt-2">Connect your Supabase instance to see branches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div
              key={branch.id}
              className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${
                branch.ref_name === 'main' || branch.ref_name === 'master'
                  ? 'border-green-500'
                  : 'border-vcs-primary'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  🌿 {branch.ref_name}
                </h3>
                {(branch.ref_name === 'main' || branch.ref_name === 'master') && (
                  <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                    Default
                  </span>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <span className="font-medium">Commit:</span>{' '}
                  <span className="font-mono">{branch.commit_hash?.slice(0, 7)}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Last updated: {new Date(branch.updated_at).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default Branches
