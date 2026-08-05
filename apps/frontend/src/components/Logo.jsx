export function LanternLogo({ size = 40 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Cercle navy */}
      <circle cx="50" cy="50" r="50" fill="#1E3A8A" />

      {/* Arc doré autour de la lanterne */}
      <path
        d="M22 72 Q50 85 78 72"
        stroke="#EAB308"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />

      {/* ─── Étoiles scintillantes ─── */}
      {/* grande étoile haut-gauche */}
      <path d="M21 22 L22.2 18 L23.4 22 L19.5 19.8 L23.4 17.6 Z" fill="#FACC15" />
      <path d="M21 22 L22.2 26 L23.4 22 L19.5 24.2 L23.4 26.4 Z" fill="#FACC15" />
      {/* petite étoile haut-droit */}
      <path d="M77 17 L78 14 L79 17 L76.2 15.5 L79 14 Z" fill="#FACC15" />
      <path d="M77 17 L78 20 L79 17 L76.2 18.5 L79 20 Z" fill="#FACC15" />
      {/* micro étoile */}
      <circle cx="83" cy="26" r="1.8" fill="#FACC15" opacity="0.8" />

      {/* ─── Lanterne ─── */}
      {/* Anneau de suspension */}
      <path
        d="M47 13 Q47 9 50 9 Q53 9 53 13"
        stroke="#EAB308"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
      />
      <rect x="48" y="12" width="4" height="6" rx="1" fill="#EAB308" />

      {/* Chapeau (toit) */}
      <path d="M34 28 Q50 21 66 28 L64 33 L36 33 Z" fill="#EAB308" />

      {/* Corps principal */}
      <rect x="34" y="33" width="32" height="35" rx="4" fill="#EAB308" />

      {/* Verre (intérieur sombre) */}
      <rect x="38" y="37" width="24" height="27" rx="2.5" fill="#1E3A8A" opacity="0.55" />

      {/* Rayons de lumière */}
      <line x1="50" y1="37" x2="50" y2="32" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="62" y1="41" x2="66" y2="38" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="38" y1="41" x2="34" y2="38" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      <line x1="66" y1="50" x2="70" y2="50" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
      <line x1="34" y1="50" x2="30" y2="50" stroke="#FACC15" strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />

      {/* Flamme */}
      <path
        d="M50 42 C46.5 46 44.5 50.5 46.5 54.5 C47.5 57.5 50 59 50 59 C50 59 52.5 57.5 53.5 54.5 C55.5 50.5 53.5 46 50 42 Z"
        fill="#FACC15"
      />
      <path
        d="M50 47 C48.5 50 48 52.5 49.5 54.5 C50 55.5 51 55 51.5 54 C52.5 52 51.5 49 50 47 Z"
        fill="white"
        opacity="0.65"
      />

      {/* Socle */}
      <rect x="30" y="68" width="40" height="5" rx="2.5" fill="#EAB308" />

      {/* ─── Branches de laurier gauche ─── */}
      <ellipse cx="25" cy="67" rx="8" ry="3" fill="#EAB308" opacity="0.85" transform="rotate(-25 25 67)" />
      <ellipse cx="18" cy="73" rx="7" ry="2.8" fill="#EAB308" opacity="0.75" transform="rotate(-40 18 73)" />
      <ellipse cx="13" cy="80" rx="6" ry="2.4" fill="#EAB308" opacity="0.6" transform="rotate(-55 13 80)" />

      {/* ─── Branches de laurier droite ─── */}
      <ellipse cx="75" cy="67" rx="8" ry="3" fill="#EAB308" opacity="0.85" transform="rotate(25 75 67)" />
      <ellipse cx="82" cy="73" rx="7" ry="2.8" fill="#EAB308" opacity="0.75" transform="rotate(40 82 73)" />
      <ellipse cx="87" cy="80" rx="6" ry="2.4" fill="#EAB308" opacity="0.6" transform="rotate(55 87 80)" />
    </svg>
  )
}
