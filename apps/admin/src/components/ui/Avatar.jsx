import { useEffect, useState } from 'react'
import { initials } from '../../lib/initials'

const SIZES = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-16 w-16 text-lg',
}

// Les initiales s'affichent tout de suite ; la photo ne les remplace qu'une
// fois chargee, et si elle echoue (connexion faible, lien expire…) les
// initiales restent — plus d'image cassee.
export function Avatar({ name, photoUrl, size = 'sm', className = '' }) {
  const [status, setStatus] = useState(photoUrl ? 'loading' : 'error')

  useEffect(() => {
    setStatus(photoUrl ? 'loading' : 'error')
  }, [photoUrl])

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-navy/10 font-semibold text-navy ${SIZES[size]} ${className}`}
    >
      {status !== 'loaded' && initials(name)}
      {photoUrl && status !== 'error' && (
        <img
          src={photoUrl}
          alt={name}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={status === 'loaded' ? 'absolute inset-0 h-full w-full object-cover' : 'hidden'}
        />
      )}
    </div>
  )
}
