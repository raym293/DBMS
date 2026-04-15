import AccessDenied from './AccessDenied.jsx'
import { useAuthz } from '../context/AuthzContext.jsx'

function RequirePermission({ resource, children }) {
  const { canView, loading } = useAuthz()

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-12 h-12 border-4 border-vcs-border rounded-full animate-spin-slow border-t-vcs-primary"></div>
      </div>
    )
  }

  if (!canView(resource)) {
    return (
      <AccessDenied
        message={`Your role does not include access to "${resource}" views.`}
      />
    )
  }

  return children
}

export default RequirePermission
