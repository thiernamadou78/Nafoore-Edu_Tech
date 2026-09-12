import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { Download, FileText } from 'lucide-react'
import logoSrc from '../components/Logo.png'
import { Button } from '../components/ui/Button'
import { CLASSE_LABELS, FUNDING_SOURCE_LABELS, LEVEL_LABELS } from './labels'

// Remplace html-to-image : sur les navigateurs Chromium récents, son clonage
// inline (des centaines de propriétés CSS répétées sur chaque élément) fait
// planter le rendu SVG->image côté Chrome — la carte exportée n'apparaît
// qu'à moitié. On construit ici le même SVG (foreignObject) mais avec une
// feuille de style classique (classes + <style>, pas de style inline par
// élément), ce qui contourne le bug.
async function captureNodeAsPng(node, pixelRatio = 2) {
  if (document.fonts?.ready) await document.fonts.ready

  const rect = node.getBoundingClientRect()
  const width = Math.ceil(rect.width)
  const height = Math.ceil(rect.height)

  const localCss = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules).map((rule) => rule.cssText).join('\n')
      } catch {
        return '' // feuille cross-origin (ex. Google Fonts) — récupérée séparément ci-dessous
      }
    })
    .join('\n')

  const fontCss = (
    await Promise.all(
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .filter((link) => new URL(link.href).origin !== window.location.origin)
        .map((link) =>
          fetch(link.href)
            .then((res) => res.text())
            .catch(() => ''),
        ),
    )
  ).join('\n')

  const clone = node.cloneNode(true)
  const originalImages = Array.from(node.querySelectorAll('img'))
  const clonedImages = Array.from(clone.querySelectorAll('img'))
  await Promise.all(
    clonedImages.map(async (img, i) => {
      const original = originalImages[i]
      if (!original || original.src.startsWith('data:')) return
      try {
        const blob = await fetch(original.src).then((res) => res.blob())
        img.src = await new Promise((resolve) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result)
          reader.readAsDataURL(blob)
        })
      } catch {
        // on garde l'URL d'origine si le fetch échoue
      }
    }),
  )

  const svgNs = 'http://www.w3.org/2000/svg'
  const svg = document.createElementNS(svgNs, 'svg')
  svg.setAttribute('width', String(width))
  svg.setAttribute('height', String(height))
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
  const foreignObject = document.createElementNS(svgNs, 'foreignObject')
  foreignObject.setAttribute('width', '100%')
  foreignObject.setAttribute('height', '100%')
  const styleEl = document.createElement('style')
  styleEl.textContent = fontCss + '\n' + localCss
  foreignObject.appendChild(styleEl)
  foreignObject.appendChild(clone)
  svg.appendChild(foreignObject)

  const svgDataUrl =
    'data:image/svg+xml;charset=utf-8,' +
    encodeURIComponent(new XMLSerializer().serializeToString(svg))

  const img = new Image()
  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
    img.src = svgDataUrl
  })

  const canvas = document.createElement('canvas')
  canvas.width = width * pixelRatio
  canvas.height = height * pixelRatio
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  return { dataUrl: canvas.toDataURL('image/png'), width, height }
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function formatReference(student) {
  const year = new Date(student.createdAt).getFullYear()
  return `NAF-${year}-${String(student.sequenceNumber).padStart(6, '0')}`
}

function getCurrentSchoolYear() {
  const now = new Date()
  const year = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return { start: new Date(year, 8, 1), end: new Date(year + 1, 7, 31) }
}

function getValidity(student) {
  const link = student.fundingLinks?.[0]
  if (link?.fundingSource === 'enterprise' && link.employee?.contract) {
    return {
      financeur: FUNDING_SOURCE_LABELS.enterprise,
      validFrom: new Date(link.employee.contract.dateDebut),
      validUntil: new Date(link.employee.contract.dateExpiration),
    }
  }
  const { start, end } = getCurrentSchoolYear()
  return {
    financeur: FUNDING_SOURCE_LABELS[link?.fundingSource] ?? FUNDING_SOURCE_LABELS.family,
    validFrom: start,
    validUntil: end,
  }
}

function formatDate(date) {
  return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

export function PassEducatifCard({ student }) {
  const [qrDataUrl, setQrDataUrl] = useState(null)
  const [exporting, setExporting] = useState(null) // null | 'png' | 'pdf'
  const [exportError, setExportError] = useState(null)
  const cardRef = useRef(null)

  useEffect(() => {
    QRCode.toDataURL(student.qrToken, { margin: 1, width: 160 })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null))
  }, [student.qrToken])

  const reference = formatReference(student)
  const { financeur, validFrom, validUntil } = getValidity(student)
  const classeLabel = student.classe
    ? (CLASSE_LABELS[student.classe] ?? student.classe)
    : (LEVEL_LABELS[student.level] ?? student.level)
  const revoked = student.passStatus === 'revoked'

  const filename = (ext) => `pass-educatif-${slugify(student.name)}.${ext}`

  const handleDownloadPng = async () => {
    setExporting('png')
    setExportError(null)
    try {
      const { dataUrl } = await captureNodeAsPng(cardRef.current)
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename('png')
      link.click()
    } catch {
      setExportError("Échec de l'export PNG.")
    } finally {
      setExporting(null)
    }
  }

  const handleDownloadPdf = async () => {
    setExporting('pdf')
    setExportError(null)
    try {
      const { dataUrl, width, height } = await captureNodeAsPng(cardRef.current)
      const doc = new jsPDF({
        orientation: width > height ? 'landscape' : 'portrait',
        unit: 'px',
        format: [width, height],
        hotfixes: ['px_scaling'],
      })
      doc.addImage(dataUrl, 'PNG', 0, 0, width, height)
      doc.save(filename('pdf'))
    } catch {
      setExportError("Échec de l'export PDF.")
    } finally {
      setExporting(null)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={cardRef} className="mx-auto w-full max-w-sm overflow-hidden rounded-3xl bg-navy shadow-lg">
        <div className="flex items-start justify-between px-6 pb-8 pt-6">
          <div>
            <p className="font-serif text-2xl font-bold text-white">Nafoore Education</p>
            <p className="mt-1 text-xs font-semibold tracking-[0.25em] text-gold-400">
              PASS ÉDUCATIF
            </p>
          </div>
          <img src={logoSrc} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
        </div>

        <div className="mx-3 rounded-2xl bg-white px-6 py-6">
          <div className="flex items-center gap-4">
            {student.photoUrl ? (
              <img
                src={student.photoUrl}
                alt={student.name}
                className="h-16 w-16 shrink-0 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-blue-50 font-serif text-xl font-bold text-navy">
                {initials(student.name)}
              </div>
            )}
            <div>
              <p className="font-serif text-lg font-bold leading-tight text-navy">{student.name}</p>
              <p className="text-sm text-gray-500">Classe de {classeLabel}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Identifiant
              </p>
              <p className="font-semibold text-navy">{reference}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Financeur
              </p>
              <p className="font-semibold text-navy">{financeur}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Valide depuis
              </p>
              <p className="font-semibold text-navy">{formatDate(validFrom)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Expire le
              </p>
              <p className="font-semibold text-navy">{formatDate(validUntil)}</p>
            </div>
          </div>

          <div className="my-5 border-t border-dashed border-gray-200" />

          {revoked ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-600">
              Pass suspendu — contacte l'équipe Nafoore Education.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-gray-500">
                À présenter au tuteur
                <br />à chaque séance
              </p>
              {qrDataUrl && (
                <div className="shrink-0 rounded-xl bg-navy p-2">
                  <div className="rounded-lg bg-white p-1.5">
                    <img src={qrDataUrl} alt="QR du Pass Éducatif" className="h-16 w-16" />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="px-6 py-3 text-center text-xs text-white/80">nafoore.com</div>
      </div>

      {!revoked && (
        <div className="flex gap-2">
          <Button
            variant="secondary"
            icon={Download}
            loading={exporting === 'png'}
            disabled={exporting !== null}
            onClick={handleDownloadPng}
          >
            PNG
          </Button>
          <Button
            variant="secondary"
            icon={FileText}
            loading={exporting === 'pdf'}
            disabled={exporting !== null}
            onClick={handleDownloadPdf}
          >
            PDF
          </Button>
        </div>
      )}
      {exportError && <p className="text-xs text-red-600">{exportError}</p>}
    </div>
  )
}
