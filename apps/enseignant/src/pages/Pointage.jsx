import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Info,
  ScanLine,
  XCircle,
} from 'lucide-react'
import { api } from '../lib/api'
import { Alert } from '../components/ui/Alert'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'

const SCANNER_ELEMENT_ID = 'qr-scanner-region'

const BANNER_STYLES = {
  success: {
    className: 'bg-green-600 text-white',
    Icon: CheckCircle2,
  },
  warning: {
    className: 'bg-amber-500 text-white',
    Icon: AlertTriangle,
  },
  info: {
    className: 'bg-sky-600 text-white',
    Icon: Info,
  },
  error: {
    className: 'bg-red-600 text-white',
    Icon: XCircle,
  },
}

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

// Motifs distincts et appuyés : une seule pulsation franche pour un succès,
// une triple pulsation pour tout ce qui demande l'attention du prof (le
// téléphone est souvent dans une poche ou sur la table entre deux séances).
const VIBRATION = {
  success: 200,
  attention: [120, 80, 120, 80, 120],
}

function describeResult(result) {
  const name = result.student?.name ?? 'cet élève'

  if (result.action === 'checkin') {
    vibrate(VIBRATION.success)
    if (result.alreadyCheckedIn) {
      return {
        variant: 'success',
        title: 'Déjà pointé(e)',
        message: `${name} est déjà pointé(e) à l'arrivée — pas besoin de rescanner tout de suite.`,
      }
    }
    return { variant: 'success', title: 'Bienvenue !', message: `${name} — bonne séance.` }
  }
  if (result.action === 'checkout') {
    vibrate(VIBRATION.success)
    return {
      variant: 'success',
      title: 'Séance terminée',
      message: `${name} — durée : ${formatDuration(result.durationMinutes)}.`,
    }
  }
  if (result.verificationStatus === 'funding_expired') {
    vibrate(VIBRATION.attention)
    return {
      variant: 'warning',
      title: 'Financement expiré',
      message: `Le financement de ${name} a expiré. Merci de vous référer à un responsable.`,
    }
  }
  if (result.verificationStatus === 'no_session_found') {
    vibrate(VIBRATION.attention)
    const nearest = result.nearestSessionAt ? new Date(result.nearestSessionAt) : null
    if (nearest) {
      const timeLabel = nearest.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      const isFuture = nearest.getTime() > Date.now()
      return {
        variant: 'info',
        title: 'Aucune séance en cours',
        message: isFuture
          ? `Séance de ${name} prévue à ${timeLabel} — trop tôt pour pointer, réessayez une trentaine de minutes avant.`
          : `Séance de ${name} prévue à ${timeLabel} — trop tard pour un scan QR. Utilisez le pointage manuel.`,
        showPlanningLink: true,
      }
    }
    return {
      variant: 'info',
      title: 'Aucune séance en cours',
      message: `Aucune séance prévue aujourd'hui pour ${name}. Vérifiez le planning ou utilisez le pointage manuel.`,
      showPlanningLink: true,
    }
  }
  vibrate(VIBRATION.attention)
  return {
    variant: 'error',
    title: 'Pass invalide',
    message: 'Ce pass est invalide. Merci de vous référer à un responsable.',
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
      vibrate(VIBRATION.attention)
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
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Pointage</h1>

      {cameraError && <Alert>{cameraError}</Alert>}
      {result?.error && <Alert>{result.error}</Alert>}

      {feedback && (
        <div
          className={`mb-4 overflow-hidden rounded-2xl shadow-lg shadow-black/10 ${BANNER_STYLES[feedback.variant].className}`}
        >
          <div className="flex items-start gap-4 px-5 py-5">
            {(() => {
              const { Icon } = BANNER_STYLES[feedback.variant]
              return <Icon size={40} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            })()}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight">{feedback.title}</p>
              <p className="mt-1 text-sm leading-snug text-white/90">{feedback.message}</p>
              {feedback.showPlanningLink && (
                <Link
                  to="/planning"
                  className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white underline-offset-2 hover:bg-white/25 hover:underline"
                >
                  <CalendarClock size={14} />
                  Aller au planning
                </Link>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={resumeScanning}
            className="block w-full border-t border-white/20 bg-black/10 py-3 text-center text-sm font-bold tracking-wide hover:bg-black/20"
          >
            Scanner le pass suivant
          </button>
        </div>
      )}

      <Card className="overflow-hidden p-4">
        <div className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <ScanLine size={16} className="text-navy" />
          {starting
            ? 'Démarrage de la caméra…'
            : paused
              ? 'En pause — confirmez ci-dessus pour scanner le pass suivant.'
              : 'Présentez le Pass QR de l’élève devant la caméra.'}
        </div>

        <div
          className={`relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-navy transition-opacity ${paused ? 'opacity-30' : ''}`}
        >
          <div id={SCANNER_ELEMENT_ID} className="h-full w-full [&_video]:object-cover" />

          {starting && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            </div>
          )}

          {!starting && !paused && (
            <div className="pointer-events-none absolute inset-0">
              {/* Cadre de visée façon scanner : 4 coins + ligne de scan animée */}
              <div className="absolute inset-8 sm:inset-10">
                {['top-0 left-0 border-t-4 border-l-4 rounded-tl-xl', 'top-0 right-0 border-t-4 border-r-4 rounded-tr-xl', 'bottom-0 left-0 border-b-4 border-l-4 rounded-bl-xl', 'bottom-0 right-0 border-b-4 border-r-4 rounded-br-xl'].map(
                  (corner) => (
                    <span
                      key={corner}
                      className={`absolute h-8 w-8 border-gold-400 ${corner}`}
                    />
                  ),
                )}
                <div className="absolute inset-x-0 top-0 h-0.5 animate-scanline bg-gold-400 shadow-[0_0_8px_2px_rgba(234,179,8,0.7)]" />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
