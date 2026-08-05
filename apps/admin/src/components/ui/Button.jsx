const VARIANTS = {
  primary:
    'bg-navy text-white hover:bg-navy/90 focus-visible:ring-navy',
  secondary:
    'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus-visible:ring-gray-400',
  success:
    'bg-green-600 text-white hover:bg-green-700 focus-visible:ring-green-500',
  warning:
    'bg-amber-500 text-white hover:bg-amber-600 focus-visible:ring-amber-400',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500',
  ghost:
    'bg-transparent text-navy hover:bg-navy/5 focus-visible:ring-navy',
}

export function Button({
  variant = 'primary',
  icon: Icon,
  className = '',
  children,
  ...props
}) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {Icon && <Icon size={16} strokeWidth={2} />}
      {children}
    </button>
  )
}
