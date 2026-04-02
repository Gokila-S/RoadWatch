import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header/Header'
import Landing from './pages/Landing/Landing'
import Login from './pages/Login/Login'
import Report from './pages/Report/Report'
import Dashboard from './pages/Dashboard/Dashboard'
import Admin from './pages/Admin/Admin'
import Analytics from './pages/Analytics/Analytics'
import useStore from './store/useStore'

// Auth Guard Component
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, userRole } = useStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />
  }

  return children
}

function App() {
  return (
    <div className="app">
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          
          {/* Citizen Routes */}
          <Route path="/report" element={<Report />} />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <Dashboard />
              </ProtectedRoute>
            } 
          />
          
          {/* Admin Routes */}
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute allowedRoles={['admin', 'superadmin']}>
                <Analytics />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
