import { Loader2 } from 'lucide-react'

export function Spinner({ label = 'Chargement…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 py-12 text-gray-400 ${className}`}>
      <Loader2 size={28} className="animate-spin text-navy" />
      {label && <p className="text-sm">{label}</p>}
    </div>
  )
}
