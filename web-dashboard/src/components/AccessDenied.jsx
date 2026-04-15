import { Link } from 'react-router-dom'

function AccessDenied({ message = 'You do not have permission to view this page.' }) {
  return (
    <div className="bg-vcs-surface rounded-xl border border-vcs-border p-8 text-center animate-fade-in">
      <h2 className="text-2xl font-bold text-zinc-100 mb-3">Access denied</h2>
      <p className="text-zinc-400 mb-6">{message}</p>
      <Link
        to="/"
        className="inline-block bg-vcs-primary hover:bg-vcs-secondary text-white px-4 py-2 rounded-lg transition-smooth"
      >
        Back to dashboard
      </Link>
    </div>
  )
}

export default AccessDenied
