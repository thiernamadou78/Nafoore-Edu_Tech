import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import { CalendarClock, ScanLine } from 'lucide-react'
import { api } from '../lib/api'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const SCANNER_ELEMENT_ID = 'qr-scanner-region'

function formatDuration(durationMinutes) {
  const hours = Math.floor(durationMinutes / 60)
  const minutes = durationMinutes % 60
  if (hours > 0) {
    return minutes > 0 ? `${hours}h${String(minutes).padStart(2, '0')}` : `${hours}h`
  }
  return `${minutes}min`
}

function vibrate(pattern) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern)
  }
}

function describeResult(result) {
  const name = result.student?.name ?? 'cet élève'

  if (result.action === 'checkin') {
    vibrate(100)
    if (result.alreadyCheckedIn) {
      return {
        variant: 'success',
        message: `${name} est déjà pointé(e) à l'arrivée — pas besoin de rescanner tout de suite.`,
      }
    }
    return { variant: 'success', message: `Bienvenue ${name} ! Bonne séance.` }
  }
  if (result.action === 'checkout') {
    vibrate(100)
    return {
      variant: 'success',
      message: `Séance terminée avec ${name}. Durée : ${formatDuration(result.durationMinutes)}.`,
    }
  }
  if (result.verificationStatus === 'funding_expired') {
    vibrate([80, 50, 80])
    return {
      variant: 'warning',
      message: `Le financement de ${name} a expiré. Merci de vous référer à un responsable.`,
    }
  }
  if (result.verificationStatus === 'no_session_found') {
    vibrate([80, 50, 80])
    const nearest = result.nearestSessionAt ? new Date(result.nearestSessionAt) : null
    if (nearest) {
      const timeLabel = nearest.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const isFuture = nearest.getTime() > Date.now()
      return {
        variant: 'info',
        message: isFuture
          ? `Séance de ${name} prévue à ${timeLabel} — trop tôt pour pointer, réessayez une trentaine de minutes avant.`
          : `Séance de ${name} prévue à ${timeLabel} — trop tard pour un scan QR. Utilisez le pointage manuel.`,
        showPlanningLink: true,
      }
    }
    return {
      variant: 'info',
      message: `Aucune séance prévue aujourd'hui pour ${name}. Vérifiez le planning ou utilisez le pointage manuel.`,
      showPlanningLink: true,
    }
  }
  vibrate([80, 50, 80])
  return {
    variant: 'error',
    message: 'Pass invalide. Merci de vous référer à un responsable.',
  }
}

export function Pointage() {
  const scannerRef = useRef(null)
  const scanningRef = useRef(true)
  const [cameraError, setCameraError] = useState(null)
  const [result, setResult] = useState(null)
  const [starting, setStarting] = useState(true)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const scanner = new Html5Qrcode(SCANNER_ELEMENT_ID)
    scannerRef.current = scanner

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: 250 },
        (decodedText) => handleDecoded(decodedText),
        () => {
          // Échec de décodage sur une frame : normal tant qu'aucun QR n'est
          // dans le cadre, on ignore silencieusement.
        },
      )
      .catch((err) => {
        setCameraError(
          "Impossible d'accéder à la caméra. Vérifiez les autorisations de votre navigateur.",
        )
        console.error(err)
      })
      .finally(() => setStarting(false))

    return () => {
      scanner.stop().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleDecoded = async (qrToken) => {
    // Tant qu'un résultat est affiché, on ignore les nouvelles détections :
    // évite qu'une même présentation du pass (famille pas encore rangée)
    // ne déclenche un check-out accidentel juste après le check-in.
    if (!scanningRef.current) return
    scanningRef.current = false
    setPaused(true)
    try {
      const scanResult = await api.post('/teacher/attendance/scan', { qrToken })
      setResult(scanResult)
    } catch (err) {
      setResult({ error: err.message })
    }
  }

  const resumeScanning = () => {
    setResult(null)
    setPaused(false)
    scanningRef.current = true
  }

  const feedback = result && !result.error ? describeResult(result) : null

  return (
    <div className="max-w-xl">
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Pointage</h1>

      {cameraError && <Alert>{cameraError}</Alert>}
      {result?.error && <Alert>{result.error}</Alert>}
      {feedback && (
        <Alert variant={feedback.variant}>
          {feedback.message}
          {feedback.showPlanningLink && (
            <Link
              to="/planning"
              className="ml-2 inline-flex items-center gap-1 font-medium underline underline-offset-2"
            >
              <CalendarClock size={14} />
              Aller au planning
            </Link>
          )}
        </Alert>
      )}

      <Card className="overflow-hidden p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <ScanLine size={16} className="text-navy" />
          {starting
            ? 'Démarrage de la caméra…'
            : paused
              ? 'En pause — confirmez pour scanner le pass suivant.'
              : 'Présentez le Pass QR de l’élève devant la caméra.'}
        </div>
        <div
          id={SCANNER_ELEMENT_ID}
          className={`mx-auto w-full max-w-sm overflow-hidden rounded-lg ${paused ? 'opacity-40' : ''}`}
        />
        {paused && (
          <Button className="mt-4 w-full" icon={ScanLine} onClick={resumeScanning}>
            Scanner le pass suivant
          </Button>
        )}
      </Card>
    </div>
  )
}
