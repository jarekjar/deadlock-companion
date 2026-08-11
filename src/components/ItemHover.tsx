import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { itemDescription, itemIcon, itemMeta, type ItemAsset } from '../lib/api'

/**
 * An item icon that shows a detail card on hover and navigates to the item's
 * page on click. Used everywhere an item appears.
 */
export default function ItemHover({
  item,
  size = 26,
  dimmed = false,
  extraLine,
}: {
  item: ItemAsset
  size?: number
  dimmed?: boolean
  /** Context-specific footer, e.g. "bought 7:30 · sold 17:21". */
  extraLine?: string
}) {
  const navigate = useNavigate()
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null)

  function show(e: React.MouseEvent) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = Math.max(140, Math.min(window.innerWidth - 140, rect.left + rect.width / 2))
    setTip({ x, y: rect.top - 6 })
  }

  const description = itemDescription(item)

  return (
    <span
      className="item-chip"
      onMouseEnter={show}
      onMouseLeave={() => setTip(null)}
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/items/${item.id}`)
      }}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') navigate(`/items/${item.id}`)
      }}
    >
      <img
        src={itemIcon(item)}
        alt={item.name}
        className={dimmed ? 'sold' : ''}
        style={{ width: size, height: size }}
        loading="lazy"
      />
      {tip && (
        <span className="item-tip" style={{ left: tip.x, top: tip.y }}>
          <span className="tip-name">{item.name}</span>
          <span className="tip-meta">{itemMeta(item)}</span>
          {description && <span className="tip-desc">{description}</span>}
          {extraLine && <span className="tip-times">{extraLine}</span>}
        </span>
      )}
    </span>
  )
}
