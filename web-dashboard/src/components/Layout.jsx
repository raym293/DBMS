import { Outlet, Link, useLocation } from 'react-router-dom'

function Layout() {
  const location = useLocation()
  
  const navItems = [
    { path: '/', label: 'Dashboard', icon: '📊' },
    { path: '/commits', label: 'Commits', icon: '📝' },
    { path: '/branches', label: 'Branches', icon: '🌿' },
    { path: '/users', label: 'Users', icon: '👥' },
  ]

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-vcs-dark text-white shadow-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            <span className="text-vcs-primary">My</span>VCS
          </h1>
          <nav className="flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  location.pathname === item.path
                    ? 'bg-vcs-primary text-white'
                    : 'hover:bg-gray-700'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <Link
            to="/login"
            className="bg-vcs-primary hover:bg-vcs-secondary px-4 py-2 rounded-lg transition-colors"
          >
            Login
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-vcs-dark text-gray-400 py-4 text-center">
        <p>© 2024 MyVCS - Custom Version Control System</p>
      </footer>
    </div>
  )
}

export default Layout
