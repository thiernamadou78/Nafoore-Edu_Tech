import { useState } from 'react'
import { Eye, EyeOff, KeyRound } from 'lucide-react'

export function PasswordInput({ value, onChange, className = '', ...props }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="relative">
      <KeyRound
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        className={`w-full rounded-lg border border-gray-300 py-2 pl-9 pr-9 text-sm focus:border-navy focus:outline-none focus:ring-1 focus:ring-navy ${className}`}
        {...props}
      />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setVisible((v) => !v)}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  )
}
