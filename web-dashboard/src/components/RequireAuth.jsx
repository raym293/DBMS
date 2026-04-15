import { Navigate, Outlet } from 'react-router-dom'
import { useAuthz } from '../context/AuthzContext.jsx'

function RequireAuth() {
  const { user, loading } = useAuthz()

  if (loading) {
    return (
      <div className="min-h-screen bg-vcs-dark flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-vcs-border rounded-full animate-spin-slow border-t-vcs-primary"></div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default RequireAuth
