import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, GraduationCap, Inbox, UserPlus } from 'lucide-react'
import { api } from '../lib/api'

const SECTIONS = [
  { key: 'leads', label: 'Nouveaux leads', icon: Inbox, path: '/leads' },
  {
    key: 'teacherApplications',
    label: 'Candidatures en attente',
    icon: GraduationCap,
    path: '/recrutement',
  },
  {
    key: 'teacherRequests',
    label: 'Demandes de professeur',
    icon: UserPlus,
    path: '/demandes-professeur',
  },
]

const POLL_INTERVAL_MS = 60000

export function NotificationBell() {
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    const load = () => api.get('/dashboard/notifications').then(setData).catch(() => {})
    load()
    const interval = setInterval(load, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const total = data?.total ?? 0
  const goTo = (path) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-navy"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {total > 99 ? '99+' : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 rounded-xl border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>
          {!data || total === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-gray-400">
              Rien de nouveau pour l'instant.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto py-1">
              {SECTIONS.map(({ key, label, icon: Icon, path }) => {
                const section = data[key]
                if (!section || section.count === 0) return null
                return (
                  <div key={key} className="border-b border-gray-50 py-1 last:border-0">
                    <button
                      onClick={() => goTo(path)}
                      className="flex w-full items-center justify-between px-4 py-2 text-left hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Icon size={15} className="text-navy" />
                        {label}
                      </span>
                      <span className="rounded-full bg-navy/10 px-2 py-0.5 text-xs font-semibold text-navy">
                        {section.count}
                      </span>
                    </button>
                    <ul>
                      {section.items.map((item) => (
                        <li key={item.id}>
                          <button
                            onClick={() => goTo(`${path}/${item.id}`)}
                            className="block w-full truncate px-4 py-1.5 text-left text-xs text-gray-500 hover:bg-gray-50 hover:text-navy"
                          >
                            {item.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
