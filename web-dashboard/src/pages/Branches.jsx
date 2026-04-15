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

// Branch icon
const BranchIcon = ({ className = "w-5 h-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7a3 3 0 100-6 3 3 0 000 6zm0 0v10m0 0a3 3 0 100 6 3 3 0 000-6zm10-10a3 3 0 100-6 3 3 0 000 6zm0 0v4a2 2 0 01-2 2H9" />
  </svg>
)

function Branches() {
  const { canView } = useAuthz()
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState(null)
  const canAccess = canView('branches')

  useEffect(() => {
    if (!canAccess) {
      setLoading(false)
      return
    }
    fetchBranches()
  }, [canAccess])

  async function fetchBranches() {
    try {
      const { data, error } = await supabase
        .from('branches')
        .select('*')
        .order('updated_at', { ascending: false })

      if (error) throw error
      setBranches(data || [])
      setErrorMessage(null)
    } catch (error) {
      console.error('Error fetching branches:', error)
      setErrorMessage(error.message)
    } finally {
      setLoading(false)
    }
  }

  if (!canAccess) {
    return <AccessDenied message='Your role does not include branch visibility.' />
  }

  if (loading) {
    return <LoadingSpinner />
  }

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-bold text-zinc-100 mb-8">Branches</h2>

      {errorMessage && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg mb-6">
          {errorMessage}
        </div>
      )}

      {branches.length === 0 ? (
        <div className="bg-vcs-surface rounded-xl border border-vcs-border p-8 text-center">
          <p className="text-zinc-400 text-lg">No branches found.</p>
          <p className="text-zinc-500 mt-2">Connect your Supabase instance to see branches.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {branches.map((branch, index) => {
            const isDefault = branch.ref_name === 'main' || branch.ref_name === 'master'
            return (
              <div
                key={branch.id}
                className={`bg-vcs-surface rounded-xl border p-6 transition-smooth hover:scale-[1.02] hover:shadow-xl animate-slide-up ${
                  isDefault
                    ? 'border-green-500/50 hover:border-green-500 hover:shadow-green-500/10'
                    : 'border-vcs-border hover:border-vcs-primary/50 hover:shadow-vcs-primary/10'
                }`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
                    <BranchIcon className={isDefault ? 'text-green-500' : 'text-vcs-primary'} />
                    {branch.ref_name}
                  </h3>
                  {isDefault && (
                    <span className="bg-green-500/20 text-green-400 text-xs px-2 py-1 rounded-full border border-green-500/30">
                      Default
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">
                    <span className="text-zinc-500">Commit:</span>{' '}
                    <span className="font-mono text-vcs-primary">{branch.commit_hash?.slice(0, 7)}</span>
                  </p>
                  <p className="text-sm text-zinc-500">
                    Last updated: {new Date(branch.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Branches
