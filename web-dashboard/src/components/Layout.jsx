import { Outlet, Link, useLocation } from 'react-router-dom'
import { useAuthz } from '../context/AuthzContext.jsx'

// SVG Icons
const ChartBarIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const DocumentTextIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
)

const BranchIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7a3 3 0 100-6 3 3 0 000 6zm0 0v10m0 0a3 3 0 100 6 3 3 0 000-6zm10-10a3 3 0 100-6 3 3 0 000 6zm0 0v4a2 2 0 01-2 2H9" />
  </svg>
)

const UsersIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
  </svg>
)

function Layout() {
  const location = useLocation()
  const { canView, profile, role, signOut } = useAuthz()
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: ChartBarIcon, resource: 'dashboard' },
    { path: '/commits', label: 'Commits', icon: DocumentTextIcon, resource: 'commits' },
    { path: '/branches', label: 'Branches', icon: BranchIcon, resource: 'branches' },
    { path: '/users', label: 'Users', icon: UsersIcon, resource: 'users' },
  ]
  const visibleNavItems = navItems.filter((item) => canView(item.resource))

  async function handleSignOut() {
    try {
      await signOut()
    } catch (err) {
      console.error('Sign out failed:', err.message)
    }
  }

  return (
    <div className="min-h-screen bg-vcs-dark flex flex-col">
      {/* Header */}
      <header className="bg-vcs-surface border-b border-vcs-border shadow-lg animate-fade-in">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="text-vcs-primary">My</span>
            <span className="text-zinc-200">VCS</span>
          </h1>
          <nav className="flex space-x-2">
            {visibleNavItems.map((item) => {
              const IconComponent = item.icon
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-smooth ${
                    location.pathname === item.path
                      ? 'bg-vcs-primary text-white shadow-lg shadow-vcs-primary/25'
                      : 'text-zinc-400 hover:bg-vcs-surface-hover hover:text-zinc-200'
                  }`}
                >
                  <IconComponent />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-zinc-200 text-sm font-medium">{profile?.username || 'User'}</p>
              <p className="text-zinc-500 text-xs uppercase tracking-wider">{role}</p>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="bg-vcs-primary hover:bg-vcs-secondary text-white px-4 py-2 rounded-lg transition-smooth hover:shadow-lg hover:shadow-vcs-primary/25"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 flex-grow">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-vcs-surface border-t border-vcs-border text-zinc-500 py-4 text-center">
        <p>2024 MyVCS - Custom Version Control System</p>
      </footer>
    </div>
  )
}

export default Layout
