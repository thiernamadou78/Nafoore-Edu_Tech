import { AlertCircle, CheckCircle2 } from 'lucide-react'

const VARIANTS = {
  error: {
    className: 'border-red-200 bg-red-50 text-red-700',
    Icon: AlertCircle,
  },
  success: {
    className: 'border-green-200 bg-green-50 text-green-700',
    Icon: CheckCircle2,
  },
}

export function Alert({ variant = 'error', children, className = '' }) {
  const { className: variantClassName, Icon } = VARIANTS[variant]
  return (
    <div
      className={`mb-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${variantClassName} ${className}`}
    >
      <Icon size={16} className="mt-0.5 shrink-0" />
      <span>{children}</span>
    </div>
  )
}
