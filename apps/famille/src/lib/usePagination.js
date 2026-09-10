import { useState } from 'react'

// Pagination "voir plus" par lots, plutôt que de tout charger d'un coup ou de
// scroller dans une boîte à hauteur fixe.
export function usePagination(items, pageSize = 5) {
  const [visibleCount, setVisibleCount] = useState(pageSize)
  const visible = items.slice(0, visibleCount)
  const hasMore = items.length > visibleCount
  const isExpanded = visibleCount > pageSize
  const remaining = items.length - visibleCount

  const showMore = () => setVisibleCount((count) => Math.min(count + pageSize, items.length))
  const collapse = () => setVisibleCount(pageSize)

  return { visible, hasMore, isExpanded, remaining, showMore, collapse, pageSize }
}
