import { Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import TeacherApplication from './pages/TeacherApplication'

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/devenir-enseignant" element={<TeacherApplication />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
