import { useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header/Header'
import Landing from './pages/Landing/Landing'
import Login from './pages/Login/Login'
import Report from './pages/Report/Report'
import ReportTracker from './pages/Report/ReportTracker'
import Dashboard from './pages/Dashboard/Dashboard'
import Admin from './pages/Admin/Admin'
import ReportsList from './pages/ReportsList/ReportsList'
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
  const { fetchCurrentUser, token } = useStore()

  useEffect(() => {
    if (!token) return
    fetchCurrentUser()
  }, [token, fetchCurrentUser])

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
            path="/report/:id" 
            element={
              <ProtectedRoute allowedRoles={['citizen']}>
                <ReportTracker />
              </ProtectedRoute>
            } 
          />
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
            path="/admin/district" 
            element={
              <ProtectedRoute allowedRoles={['district_admin', 'super_admin']}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/super" 
            element={
              <ProtectedRoute allowedRoles={['super_admin']}>
                <Admin />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/reports" 
            element={
              <ProtectedRoute allowedRoles={['district_admin', 'super_admin']}>
                <ReportsList />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/analytics" 
            element={
              <ProtectedRoute allowedRoles={['district_admin', 'super_admin']}>
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
