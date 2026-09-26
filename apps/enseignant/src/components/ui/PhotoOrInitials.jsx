import { useEffect, useState } from 'react'

// Photo de profil tolerante : les initiales s'affichent tout de suite, la
// photo ne les remplace qu'une fois entierement chargee, et si elle ne se
// charge pas (connexion faible, lien expire…) les initiales restent — plus
// d'image cassee ou a moitie chargee.
export function PhotoOrInitials({ src, alt = '', initials, className = 'h-full w-full object-cover' }) {
  const [status, setStatus] = useState(src ? 'loading' : 'error')

  useEffect(() => {
    setStatus(src ? 'loading' : 'error')
  }, [src])

  return (
    <>
      {status !== 'loaded' && initials}
      {src && status !== 'error' && (
        <img
          src={src}
          alt={alt}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
          className={status === 'loaded' ? className : 'hidden'}
        />
      )}
    </>
  )
}
