// Composants de table partagés pour les listes admin (élèves, enseignants…) :
// un rendu tabulaire sobre et cohérent, plus lisible qu'une grille de cartes
// dès que la liste dépasse une poignée d'éléments.

export function Table({ children, className = '' }) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    </div>
  )
}

export function Thead({ children }) {
  return (
    <thead>
      <tr className="border-b border-gray-100 bg-gray-50/70">{children}</tr>
    </thead>
  )
}

export function Th({ children, className = '' }) {
  return (
    <th
      className={`whitespace-nowrap px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500 ${className}`}
    >
      {children}
    </th>
  )
}

export function Tbody({ children }) {
  return <tbody className="divide-y divide-gray-100">{children}</tbody>
}

export function Tr({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`group transition-colors ${onClick ? 'cursor-pointer hover:bg-gold-400/5' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}

export function Td({ children, className = '' }) {
  return <td className={`px-4 py-3 align-middle ${className}`}>{children}</td>
}
