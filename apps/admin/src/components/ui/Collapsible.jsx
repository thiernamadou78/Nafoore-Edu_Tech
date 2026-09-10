import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from './Card'

// Section "à déballer" : replié par défaut derrière son seul titre, pour ne
// pas surcharger la vue avec des infos secondaires (identité, documents...).
export function Collapsible({ title, icon: Icon, badge, defaultOpen = false, className = '', children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Card className={`overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-6 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-gray-900">
          {Icon && <Icon size={16} className="text-navy" />}
          {title}
          {badge}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-6 pb-6">{children}</div>}
    </Card>
  )
}
