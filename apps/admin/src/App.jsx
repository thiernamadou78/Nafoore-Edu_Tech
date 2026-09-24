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
import { Subjects } from './pages/Subjects'
import { TeacherRequestsList } from './pages/teacher-requests/TeacherRequestsList'
import { TeacherRequestDetail } from './pages/teacher-requests/TeacherRequestDetail'
import { RenewalsList } from './pages/renewals/RenewalsList'
import { ConversationsList } from './pages/messaging/ConversationsList'
import { ConversationDetail } from './pages/messaging/ConversationDetail'
import { SupportTicketsList } from './pages/support/SupportTicketsList'
import { EnterprisesList } from './pages/entreprises/EnterprisesList'
import { EnterpriseDetail } from './pages/entreprises/EnterpriseDetail'
import { EnterpriseImport } from './pages/entreprises/EnterpriseImport'
import { FormulasList } from './pages/formules/FormulasList'
import { SiteVitrine } from './pages/site-vitrine/SiteVitrine'
import { AttendanceAlerts } from './pages/attendance/AttendanceAlerts'
import { Planning } from './pages/planning/Planning'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/mot-de-passe-oublie" element={<ForgotPassword />} />
        <Route path="/reinitialiser-mot-de-passe" element={<ResetPassword />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AdminLayout />}>
            <Route element={<ProtectedRoute module="dashboard" />}>
              <Route path="/" element={<Dashboard />} />
            </Route>
            <Route element={<ProtectedRoute module="recruitment" />}>
              <Route path="/recrutement" element={<RecruitmentList />} />
              <Route path="/recrutement/:id" element={<RecruitmentDetail />} />
            </Route>
            <Route element={<ProtectedRoute module="leads" />}>
              <Route path="/leads" element={<LeadsList />} />
              <Route path="/leads/nouvelle" element={<CreateFamily />} />
              <Route path="/leads/nouvelle/enfants" element={<CreateChild />} />
              <Route path="/leads/:id" element={<LeadDetail />} />
            </Route>
            <Route element={<ProtectedRoute module="students" />}>
              <Route path="/eleves" element={<StudentsList />} />
              <Route path="/eleves/:id" element={<StudentDetail />} />
            </Route>
            <Route element={<ProtectedRoute module="teachers" />}>
              <Route path="/enseignants" element={<TeachersList />} />
              <Route path="/enseignants/:id" element={<TeacherDetail />} />
            </Route>
            <Route element={<ProtectedRoute module="teacher_requests" />}>
              <Route path="/demandes-professeur" element={<TeacherRequestsList />} />
              <Route path="/demandes-professeur/:id" element={<TeacherRequestDetail />} />
            </Route>
            <Route element={<ProtectedRoute module="renewals" />}>
              <Route path="/renouvellements" element={<RenewalsList />} />
            </Route>
            <Route element={<ProtectedRoute module="messaging" />}>
              <Route path="/conversations" element={<ConversationsList />} />
              <Route path="/conversations/:id" element={<ConversationDetail />} />
            </Route>
            <Route element={<ProtectedRoute module="planning" />}>
              <Route path="/planning" element={<Planning />} />
            </Route>
            <Route element={<ProtectedRoute module="attendance" />}>
              <Route path="/pointages" element={<AttendanceAlerts />} />
            </Route>
            <Route element={<ProtectedRoute module="support" />}>
              <Route path="/support-tickets" element={<SupportTicketsList />} />
            </Route>
            <Route element={<ProtectedRoute module="enterprises" />}>
              <Route path="/entreprises" element={<EnterprisesList />} />
              <Route path="/entreprises/:id" element={<EnterpriseDetail />} />
              <Route path="/entreprises/:id/import" element={<EnterpriseImport />} />
            </Route>
            <Route element={<ProtectedRoute module="formulas" />}>
              <Route path="/formules" element={<FormulasList />} />
            </Route>
            <Route element={<ProtectedRoute module="site" />}>
              <Route path="/site-vitrine" element={<SiteVitrine />} />
            </Route>
            <Route element={<ProtectedRoute superAdminOnly />}>
              <Route path="/comptes" element={<AdminAccounts />} />
              <Route path="/matieres" element={<Subjects />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
