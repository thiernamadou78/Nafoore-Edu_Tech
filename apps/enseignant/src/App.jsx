import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { TeacherLayout } from './components/TeacherLayout'
import { Login } from './pages/Login'
import { ChangePassword } from './pages/ChangePassword'
import { StudentsList } from './pages/StudentsList'
import { StudentDetail } from './pages/StudentDetail'
import { Planning } from './pages/Planning'
import { Dashboard } from './pages/Dashboard'
import { Remuneration } from './pages/Remuneration'
import { Messagerie } from './pages/Messagerie'
import { Avis } from './pages/Avis'
import { Support } from './pages/Support'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/changer-mot-de-passe" element={<ChangePassword />} />
          <Route element={<TeacherLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/eleves" element={<StudentsList />} />
            <Route path="/eleves/:id" element={<StudentDetail />} />
            <Route path="/planning" element={<Planning />} />
            <Route path="/remuneration" element={<Remuneration />} />
            <Route path="/messagerie" element={<Messagerie />} />
            <Route path="/avis" element={<Avis />} />
            <Route path="/support" element={<Support />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
