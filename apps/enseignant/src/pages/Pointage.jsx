import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Html5Qrcode } from 'html5-qrcode'
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Info,
  RotateCcw,
  ScanLine,
  X,
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
        title: 'Début déjà enregistré',
        message: `Le début de la séance avec ${name} est déjà enregistré — inutile de rescanner tout de suite.`,
      }
    }
    return {
      variant: 'success',
      title: 'Début de séance enregistré',
      message: `Ton arrivée chez ${name} est enregistrée — bonne séance !`,
    }
  }
  if (result.action === 'checkout') {
    vibrate(VIBRATION.success)
    return {
      variant: 'success',
      title: 'Séance terminée',
      message: `Séance avec ${name} terminée — durée : ${formatDuration(result.durationMinutes)}.`,
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
  const [cameraStopped, setCameraStopped] = useState(false)
  const [result, setResult] = useState(null)
  const [starting, setStarting] = useState(true)
  const [paused, setPaused] = useState(false)
  const [showReasonField, setShowReasonField] = useState(false)
  const [earlyReason, setEarlyReason] = useState('')
  const [confirmingEarly, setConfirmingEarly] = useState(false)
  const [reportAttended, setReportAttended] = useState(true)
  const [reportNotes, setReportNotes] = useState('')
  const [savingReport, setSavingReport] = useState(false)

  const startCamera = () => {
    setStarting(true)
    setCameraError(null)
    const scanner = scannerRef.current ?? new Html5Qrcode(SCANNER_ELEMENT_ID)
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
  }

  useEffect(() => {
    startCamera()
    return () => {
      scannerRef.current?.stop().catch(() => {})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Un scan ne coupe pas la camera : elle reste allumee (juste assourdie
  // visuellement) tant qu'on n'a pas explicitement clique sur Annuler —
  // sinon elle continuerait de tourner en arriere-plan indefiniment.
  const stopCamera = () => {
    scannerRef.current?.stop().catch(() => {})
    scanningRef.current = false
    setCameraStopped(true)
    setPaused(false)
    setResult(null)
  }

  const restartCamera = () => {
    setCameraStopped(false)
    scanningRef.current = true
    startCamera()
  }

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
    setShowReasonField(false)
    setEarlyReason('')
    setReportAttended(true)
    setReportNotes('')
    scanningRef.current = true
  }

  const handleSaveReport = async (e) => {
    e.preventDefault()
    setSavingReport(true)
    try {
      await api.patch(`/teacher/sessions/${result.sessionId}`, {
        attended: reportAttended,
        notes: reportNotes || undefined,
        status: 'realisee',
      })
      resumeScanning()
    } catch (err) {
      setResult({ ...result, reportError: err.message })
    } finally {
      setSavingReport(false)
    }
  }

  const handleConfirmEarlyCheckout = async (e) => {
    e.preventDefault()
    if (!earlyReason.trim()) return
    setConfirmingEarly(true)
    try {
      const scanResult = await api.post('/teacher/attendance/checkout-confirm', {
        sessionId: result.sessionId,
        reason: earlyReason,
      })
      vibrate(VIBRATION.success)
      setResult(scanResult)
      setShowReasonField(false)
      setEarlyReason('')
    } catch (err) {
      vibrate(VIBRATION.attention)
      setResult({ error: err.message })
    } finally {
      setConfirmingEarly(false)
    }
  }

  const isEarlyCheckoutConfirm = result?.action === 'checkout_confirm_required'
  const feedback = result && !result.error && !isEarlyCheckoutConfirm ? describeResult(result) : null

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 font-serif text-2xl font-bold text-navy">Pointage</h1>

      {cameraError && <Alert>{cameraError}</Alert>}
      {result?.error && <Alert>{result.error}</Alert>}

      {isEarlyCheckoutConfirm && (
        <div className="mb-4 overflow-hidden rounded-2xl bg-amber-500 text-white shadow-lg shadow-black/10">
          <div className="flex items-start gap-4 px-5 py-5">
            <AlertTriangle size={40} strokeWidth={1.75} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold leading-tight">Fin de séance anticipée</p>
              <p className="mt-1 text-sm leading-snug text-white/90">
                Il vous reste {result.remainingMinutes} minute{result.remainingMinutes > 1 ? 's' : ''} sur
                la séance de {result.student?.name ?? 'cet élève'}. Voulez-vous confirmer la fin de
                séance ?
              </p>

              {!showReasonField ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowReasonField(true)}
                    className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-white/90"
                  >
                    Oui, terminer
                  </button>
                  <button
                    type="button"
                    onClick={resumeScanning}
                    className="rounded-full bg-black/10 px-3.5 py-1.5 text-xs font-bold hover:bg-black/20"
                  >
                    Non, annuler
                  </button>
                </div>
              ) : (
                <form onSubmit={handleConfirmEarlyCheckout} className="mt-3 space-y-2">
                  <textarea
                    autoFocus
                    required
                    value={earlyReason}
                    onChange={(e) => setEarlyReason(e.target.value)}
                    rows={2}
                    placeholder="Raison de la fin anticipée…"
                    className="w-full resize-none rounded-lg border-0 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={confirmingEarly || !earlyReason.trim()}
                      className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {confirmingEarly ? 'Confirmation…' : 'Confirmer la fin de séance'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowReasonField(false)
                        setEarlyReason('')
                      }}
                      className="rounded-full bg-black/10 px-3.5 py-1.5 text-xs font-bold hover:bg-black/20"
                    >
                      Retour
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

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
          {result.action === 'checkout' && result.sessionId ? (
            <form onSubmit={handleSaveReport} className="border-t border-white/20 bg-black/10 px-5 py-4">
              <p className="mb-2 text-sm font-bold">Compte-rendu de la séance</p>
              <label className="mb-2 flex items-center gap-2 text-sm text-white/90">
                <input
                  type="checkbox"
                  checked={reportAttended}
                  onChange={(e) => setReportAttended(e.target.checked)}
                  className="h-4 w-4 rounded border-white/40 bg-transparent"
                />
                Élève présent
              </label>
              <textarea
                required
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                rows={2}
                placeholder="Ce qui a été travaillé, points à retravailler… (obligatoire pour clôturer)"
                className="w-full resize-none rounded-lg border-0 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white"
              />
              {result.reportError && (
                <p className="mt-2 text-xs font-semibold text-white">{result.reportError}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="submit"
                  disabled={savingReport || !reportNotes.trim()}
                  className="rounded-full bg-white px-3.5 py-1.5 text-xs font-bold text-gray-800 hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {savingReport ? 'Enregistrement…' : 'Enregistrer le compte-rendu'}
                </button>
                <button
                  type="button"
                  onClick={resumeScanning}
                  className="rounded-full bg-black/10 px-3.5 py-1.5 text-xs font-bold hover:bg-black/20"
                >
                  Plus tard
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={feedback.variant === 'success' ? stopCamera : resumeScanning}
              className="block w-full border-t border-white/20 bg-black/10 py-3 text-center text-sm font-bold tracking-wide hover:bg-black/20"
            >
              {feedback.variant === 'success' ? 'Terminer' : 'Réessayer'}
            </button>
          )}
        </div>
      )}

      <Card className="overflow-hidden p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <ScanLine size={16} className="text-navy" />
            {cameraStopped
              ? 'Caméra arrêtée.'
              : starting
                ? 'Démarrage de la caméra…'
                : paused
                  ? 'Scan pris en compte — voir le résultat ci-dessus.'
                  : 'Présentez le Pass QR de l’élève devant la caméra.'}
          </div>
          {!cameraStopped && !starting && (
            <button
              type="button"
              onClick={stopCamera}
              className="inline-flex items-center gap-1 rounded-full border border-gray-300 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              <X size={12} />
              Annuler
            </button>
          )}
        </div>

        {cameraStopped ? (
          <div className="mx-auto flex aspect-square w-full max-w-sm flex-col items-center justify-center gap-3 rounded-2xl bg-gray-100 text-gray-500">
            <ScanLine size={32} className="text-gray-400" />
            <p className="text-sm">La caméra est arrêtée.</p>
            <Button icon={RotateCcw} onClick={restartCamera}>
              Relancer le scan
            </Button>
          </div>
        ) : (
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
        )}
      </Card>
    </div>
  )
}
