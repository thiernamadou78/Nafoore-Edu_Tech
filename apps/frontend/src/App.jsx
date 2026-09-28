import { useEffect } from 'react'
import { Route, Routes, useLocation } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import TeacherApplication from './pages/TeacherApplication'
import ApplicationCompletion from './pages/ApplicationCompletion'
import MentionsLegales from './pages/legal/MentionsLegales'
import CGU from './pages/legal/CGU'
import Confidentialite from './pages/legal/Confidentialite'

// Changement de page : on repart du haut (sauf lien vers une ancre, ex.
// /#contact, gere par le navigateur).
function ScrollToTop() {
  const { pathname, hash } = useLocation()
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0)
  }, [pathname, hash])
  return null
}

export default function App() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/devenir-enseignant" element={<TeacherApplication />} />
          <Route path="/candidature/completer/:token" element={<ApplicationCompletion />} />
          <Route path="/mentions-legales" element={<MentionsLegales />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/confidentialite" element={<Confidentialite />} />
        </Routes>
      </main>
      <Footer />
    </>
  )
}
