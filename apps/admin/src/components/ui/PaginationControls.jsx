export function PaginationControls({ hasMore, isExpanded, remaining, pageSize, onShowMore, onCollapse, className = '' }) {
  if (!hasMore && !isExpanded) return null
  return (
    <div className={`flex gap-3 ${className}`}>
      {hasMore && (
        <button
          type="button"
          onClick={onShowMore}
          className="text-left text-xs font-semibold text-navy/70 hover:text-navy"
        >
          Voir {Math.min(pageSize, remaining)} de plus
        </button>
      )}
      {isExpanded && (
        <button
          type="button"
          onClick={onCollapse}
          className="text-left text-xs font-semibold text-gray-400 hover:text-gray-600"
        >
          Réduire
        </button>
      )}
    </div>
  )
}
