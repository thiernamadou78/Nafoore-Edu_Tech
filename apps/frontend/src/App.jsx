import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import TeacherApplication from './pages/TeacherApplication'
import ApplicationCompletion from './pages/ApplicationCompletion'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/devenir-enseignant" element={<TeacherApplication />} />
          <Route path="/candidature/completer/:token" element={<ApplicationCompletion />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
