const TONES = {
  gray: 'bg-gray-100 text-gray-700',
  blue: 'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  green: 'bg-green-100 text-green-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  gold: 'bg-gold-400/20 text-navy',
}

export function Badge({ tone = 'gray', icon: Icon, children, className = '' }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${TONES[tone]} ${className}`}
    >
      {Icon && <Icon size={12} strokeWidth={2.5} />}
      {children}
    </span>
  )
}
