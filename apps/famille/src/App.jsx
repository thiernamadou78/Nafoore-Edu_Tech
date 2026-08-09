import { Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { FamilyLayout } from './components/FamilyLayout'
import { Login } from './pages/Login'
import { ChangePassword } from './pages/ChangePassword'
import { Welcome } from './pages/Welcome'
import { StudentsList } from './pages/StudentsList'
import { StudentDetail } from './pages/StudentDetail'
import { AddStudent } from './pages/AddStudent'

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/changer-mot-de-passe" element={<ChangePassword />} />
          <Route path="/bienvenue" element={<Welcome />} />
          <Route element={<FamilyLayout />}>
            <Route path="/" element={<StudentsList />} />
            <Route path="/eleves/nouveau" element={<AddStudent />} />
            <Route path="/eleves/:id" element={<StudentDetail />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  )
}
