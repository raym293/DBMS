import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import RequireAuth from './components/RequireAuth.jsx'
import RequirePermission from './components/RequirePermission.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Commits from './pages/Commits.jsx'
import Branches from './pages/Branches.jsx'
import Users from './pages/Users.jsx'
import Login from './pages/Login.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth />}>
        <Route path="/" element={<Layout />}>
          <Route
            index
            element={
              <RequirePermission resource="dashboard">
                <Dashboard />
              </RequirePermission>
            }
          />
          <Route
            path="commits"
            element={
              <RequirePermission resource="commits">
                <Commits />
              </RequirePermission>
            }
          />
          <Route
            path="branches"
            element={
              <RequirePermission resource="branches">
                <Branches />
              </RequirePermission>
            }
          />
          <Route
            path="users"
            element={
              <RequirePermission resource="users">
                <Users />
              </RequirePermission>
            }
          />
        </Route>
      </Route>
    </Routes>
  )
}

export default App
