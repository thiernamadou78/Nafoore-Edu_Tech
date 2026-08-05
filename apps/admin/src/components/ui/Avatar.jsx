import { initials } from '../../lib/initials'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-lg',
}

export function Avatar({ name, photoUrl, size = 'sm', className = '' }) {
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className={`shrink-0 rounded-full object-cover ${SIZES[size]} ${className}`}
      />
    )
  }

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full bg-navy/10 font-semibold text-navy ${SIZES[size]} ${className}`}
    >
      {initials(name)}
    </div>
  )
}
