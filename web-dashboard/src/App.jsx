import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Commits from './pages/Commits.jsx'
import Branches from './pages/Branches.jsx'
import Users from './pages/Users.jsx'
import Login from './pages/Login.jsx'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="commits" element={<Commits />} />
        <Route path="branches" element={<Branches />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  )
}

export default App
