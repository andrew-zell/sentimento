import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'

// Public pages
import PublicSurvey from './pages/PublicSurvey'
import PulseSurvey from './pages/PulseSurvey'
import Login from './pages/Login'
import SurveyComplete from './pages/SurveyComplete'

// Admin pages
import AdminLayout from './components/layout/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Surveys from './pages/admin/Surveys'
import SurveyForm from './pages/admin/SurveyForm'
import Questionnaires from './pages/admin/Questionnaires'
import QuestionnaireForm from './pages/admin/QuestionnaireForm'
import Responses from './pages/admin/Responses'
import Analytics from './pages/admin/Analytics'
import Users from './pages/admin/Users'

function ProtectedRoute({ children, requiredRole }: { children: React.ReactNode, requiredRole?: string }) {
  const { user, isLoading } = useAuth()
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-white text-lg animate-pulse-soft">Loading...</div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  if (requiredRole === 'admin' && user.role !== 'admin') {
    return <Navigate to="/admin" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      {/* Public survey routes */}
      <Route path="/:centerCode/:tourType" element={<PublicSurvey />} />
      <Route path="/:centerCode/:tourType/pulse" element={<PulseSurvey />} />
      <Route path="/survey/complete" element={<SurveyComplete />} />
      
      {/* Auth */}
      <Route path="/login" element={<Login />} />
      
      {/* Admin routes */}
      <Route path="/admin" element={
        <ProtectedRoute>
          <AdminLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="surveys" element={<Surveys />} />
        <Route path="surveys/new" element={<SurveyForm />} />
        <Route path="surveys/:id/edit" element={<SurveyForm />} />
        <Route path="questionnaires" element={<Questionnaires />} />
        <Route path="questionnaires/new" element={<QuestionnaireForm />} />
        <Route path="questionnaires/:id/edit" element={<QuestionnaireForm />} />
        <Route path="responses" element={<Responses />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="users" element={
          <ProtectedRoute requiredRole="admin">
            <Users />
          </ProtectedRoute>
        } />
      </Route>
      
      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App

