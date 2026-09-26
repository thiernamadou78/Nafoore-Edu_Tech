import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import './index.css'
import { registerSW } from 'virtual:pwa-register'

// Appli installee (PWA) : on verifie s'il existe une nouvelle version a chaque
// retour au premier plan et toutes les 30 min ; si oui, elle s'installe et la
// page se recharge d'elle-meme (registerType "autoUpdate").
registerSW({
  immediate: true,
  onRegisteredSW(_swUrl, registration) {
    if (!registration) return
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible' && navigator.onLine) {
        registration.update().catch(() => {})
      }
    }
    setInterval(checkForUpdate, 30 * 60 * 1000)
    document.addEventListener('visibilitychange', checkForUpdate)
    window.addEventListener('focus', checkForUpdate)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
