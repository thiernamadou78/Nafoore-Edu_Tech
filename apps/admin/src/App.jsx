import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/AdminLayout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { LeadsList } from './pages/leads/LeadsList'
import { LeadDetail } from './pages/leads/LeadDetail'
import { StudentsList } from './pages/students/StudentsList'
import { StudentDetail } from './pages/students/StudentDetail'
import { TeachersList } from './pages/teachers/TeachersList'
import { TeacherDetail } from './pages/teachers/TeacherDetail'
import { RecruitmentList } from './pages/recruitment/RecruitmentList'
import { RecruitmentDetail } from './pages/recruitment/RecruitmentDetail'
import { AdminAccounts } from './pages/AdminAccounts'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recrutement" element={<RecruitmentList />} />
            <Route path="/recrutement/:id" element={<RecruitmentDetail />} />
            <Route element={<ProtectedRoute roles={['super_admin', 'admin']} />}>
              <Route path="/leads" element={<LeadsList />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/eleves" element={<StudentsList />} />
              <Route path="/eleves/:id" element={<StudentDetail />} />
              <Route path="/enseignants" element={<TeachersList />} />
              <Route path="/enseignants/:id" element={<TeacherDetail />} />
            </Route>
            <Route element={<ProtectedRoute roles={['super_admin']} />}>
              <Route path="/comptes" element={<AdminAccounts />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
