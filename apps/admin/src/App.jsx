import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminLayout } from './components/AdminLayout'
import { Login } from './pages/Login'
import { ForgotPassword } from './pages/ForgotPassword'
import { ResetPassword } from './pages/ResetPassword'
import { Dashboard } from './pages/Dashboard'
import { LeadsList } from './pages/leads/LeadsList'
import { LeadDetail } from './pages/leads/LeadDetail'
import { CreateFamily } from './pages/leads/CreateFamily'
import { CreateChild } from './pages/leads/CreateChild'
import { StudentsList } from './pages/students/StudentsList'
import { StudentDetail } from './pages/students/StudentDetail'
import { TeachersList } from './pages/teachers/TeachersList'
import { TeacherDetail } from './pages/teachers/TeacherDetail'
import { RecruitmentList } from './pages/recruitment/RecruitmentList'
import { RecruitmentDetail } from './pages/recruitment/RecruitmentDetail'
import { AdminAccounts } from './pages/AdminAccounts'
import { TeacherRequestsList } from './pages/teacher-requests/TeacherRequestsList'
import { TeacherRequestDetail } from './pages/teacher-requests/TeacherRequestDetail'
import { ConversationsList } from './pages/messaging/ConversationsList'
import { ConversationDetail } from './pages/messaging/ConversationDetail'
import { SupportTicketsList } from './pages/support/SupportTicketsList'
import { EnterprisesList } from './pages/entreprises/EnterprisesList'
import { EnterpriseDetail } from './pages/entreprises/EnterpriseDetail'
import { EnterpriseImport } from './pages/entreprises/EnterpriseImport'
import { FormulasList } from './pages/formules/FormulasList'
import { SiteVitrine } from './pages/site-vitrine/SiteVitrine'
import { AttendanceAlerts } from './pages/attendance/AttendanceAlerts'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/recrutement" element={<RecruitmentList />} />
            <Route path="/recrutement/:id" element={<RecruitmentDetail />} />
            <Route element={<ProtectedRoute roles={['super_admin', 'admin']} />}>
              <Route path="/leads" element={<LeadsList />} />
              <Route path="/leads/nouvelle" element={<CreateFamily />} />
              <Route path="/leads/nouvelle/enfants" element={<CreateChild />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
              <Route path="/eleves" element={<StudentsList />} />
              <Route path="/eleves/:id" element={<StudentDetail />} />
              <Route path="/enseignants" element={<TeachersList />} />
              <Route path="/enseignants/:id" element={<TeacherDetail />} />
              <Route path="/demandes-professeur" element={<TeacherRequestsList />} />
              <Route path="/demandes-professeur/:id" element={<TeacherRequestDetail />} />
              <Route path="/conversations" element={<ConversationsList />} />
              <Route path="/conversations/:id" element={<ConversationDetail />} />
              <Route path="/pointages" element={<AttendanceAlerts />} />
              <Route path="/support-tickets" element={<SupportTicketsList />} />
              <Route path="/entreprises" element={<EnterprisesList />} />
              <Route path="/entreprises/:id" element={<EnterpriseDetail />} />
              <Route path="/entreprises/:id/import" element={<EnterpriseImport />} />
              <Route path="/formules" element={<FormulasList />} />
              <Route path="/site-vitrine" element={<SiteVitrine />} />
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
