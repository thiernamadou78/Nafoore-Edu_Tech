import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { api } from '../lib/api'
import { Card } from '../components/ui/Card'

// Centre par défaut sur Paris/Île-de-France — la quasi-totalité des
// élèves/enseignants y sont, pas besoin de recentrer dynamiquement.
const DEFAULT_CENTER = [48.8566, 2.3522]
const DEFAULT_ZOOM = 10

// Silhouette "mannequin" pour les deux types de pin — seule la couleur
// distingue élève (navy) et enseignant (or).
const USER_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'

function pinIcon(color) {
  return L.divIcon({
    className: '',
    html: `<div style="display:flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)">${USER_SVG}</div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  })
}

// Le survol ouvre la meme fenetre que le clic (nom, adresse, lien vers la
// fiche) ; elle reste ouverte tant que la souris est sur le pin ou dessus.
function HoverMarker({ children, ...props }) {
  const handlers = useMemo(() => {
    let timer
    const cancel = () => clearTimeout(timer)
    const scheduleClose = (marker) => {
      timer = setTimeout(() => marker.closePopup(), 250)
    }
    return {
      mouseover: (event) => {
        cancel()
        event.target.openPopup()
      },
      mouseout: (event) => scheduleClose(event.target),
      popupopen: (event) => {
        const element = event.popup.getElement()
        element?.addEventListener('mouseenter', cancel)
        element?.addEventListener('mouseleave', () => scheduleClose(event.target))
      },
    }
  }, [])
  return (
    <Marker {...props} eventHandlers={handlers}>
      {children}
    </Marker>
  )
}

// Cadre de la carte pour un delegue : le cercle de sa zone.
function zoneBounds({ latitude, longitude, radiusKm }) {
  const latDelta = radiusKm / 111
  const lngDelta = radiusKm / (111 * Math.cos((latitude * Math.PI) / 180))
  return [
    [latitude - latDelta, longitude - lngDelta],
    [latitude + latDelta, longitude + lngDelta],
  ]
}

const STUDENT_ICON = pinIcon('#1E3A8A')
const TEACHER_ICON = pinIcon('#EAB308')

export function DashboardMap() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    api
      .get('/dashboard/map')
      .then(setData)
      .catch((err) => setError(err.message))
  }, [])

  const studentCount = data?.students.length ?? 0
  const teacherCount = data?.teachers.length ?? 0
  const zone = data?.zone ?? null
  const isEmpty = data && studentCount === 0 && teacherCount === 0 && !zone

  return (
    <Card className="mb-6 overflow-hidden p-0">
      <div className="flex items-center justify-between p-6 pb-0">
        <h2 className="flex items-center gap-2 font-semibold text-gray-900">
          <MapPin size={16} className="text-navy" />
          Carte des élèves et enseignants
          {zone && (
            <span className="text-sm font-normal text-gray-500">
              — votre zone : {zone.address} ({zone.radiusKm} km)
            </span>
          )}
        </h2>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-navy" />
            {studentCount} élève{studentCount > 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-gold-500" />
            {teacherCount} enseignant{teacherCount > 1 ? 's' : ''}
          </span>
        </div>
      </div>

      <div className="p-6 pt-4">
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : !data ? (
          <p className="text-sm text-gray-500">Chargement de la carte…</p>
        ) : isEmpty ? (
          <p className="text-sm text-gray-500">
            Aucune adresse géocodée pour l'instant — les pins apparaîtront dès que des élèves ou
            enseignants auront une adresse renseignée.
          </p>
        ) : (
          <div className="h-[420px] overflow-hidden rounded-xl border border-gray-100">
            <MapContainer
              {...(zone
                ? { bounds: zoneBounds(zone) }
                : { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM })}
              scrollWheelZoom={false}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {zone && (
                <Circle
                  center={[zone.latitude, zone.longitude]}
                  radius={zone.radiusKm * 1000}
                  pathOptions={{ color: '#1E3A8A', weight: 2, fillColor: '#EAB308', fillOpacity: 0.08 }}
                />
              )}
              {data.students.map((student) => (
                <HoverMarker
                  key={`student-${student.id}`}
                  position={[student.latitude, student.longitude]}
                  icon={STUDENT_ICON}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      {student.address && <p className="text-gray-500">{student.address}</p>}
                      <button
                        type="button"
                        onClick={() => navigate(`/eleves/${student.id}`)}
                        className="mt-1.5 text-xs font-semibold text-navy hover:underline"
                      >
                        Voir la fiche élève
                      </button>
                    </div>
                  </Popup>
                </HoverMarker>
              ))}
              {data.teachers.map((teacher) => (
                <HoverMarker
                  key={`teacher-${teacher.id}`}
                  position={[teacher.latitude, teacher.longitude]}
                  icon={TEACHER_ICON}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold text-gray-900">{teacher.name}</p>
                      {teacher.address && <p className="text-gray-500">{teacher.address}</p>}
                      <button
                        type="button"
                        onClick={() => navigate(`/enseignants/${teacher.id}`)}
                        className="mt-1.5 text-xs font-semibold text-navy hover:underline"
                      >
                        Voir la fiche enseignant
                      </button>
                    </div>
                  </Popup>
                </HoverMarker>
              ))}
            </MapContainer>
          </div>
        )}
      </div>
    </Card>
  )
}
