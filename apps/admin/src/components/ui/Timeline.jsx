/**
 * Petite frise verticale pour un historique de changements (notes, avenants,
 * changements d'enseignant...). `items` : tableau libre, `renderItem` produit
 * le contenu de chaque entrée — ce composant ne gère que l'espacement/le trait.
 */
export function Timeline({ items, renderItem, keyField = 'id', emptyLabel = 'Rien pour l’instant.' }) {
  if (!items || items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyLabel}</p>
  }

  return (
    <ul className="space-y-3 border-l-2 border-gray-100 pl-4">
      {items.map((item) => (
        <li key={item[keyField]} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gold-400" />
          {renderItem(item)}
        </li>
      ))}
    </ul>
  )
}
