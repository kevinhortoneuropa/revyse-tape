import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

import { cn } from '~/components/ui/cn'
import type { QuotedAsset } from '~/lib/domain'

import { AssetCard } from './AssetCard'

export function SortableAssetCard({ asset }: { readonly asset: QuotedAsset }) {
  // The id is the symbol, never an index. onDragEnd hands these straight to
  // `reorder`, which is why a drag inside a filtered subset stays correct.
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: asset.symbol,
  })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'touch-none',
        // Lift the card being dragged above its neighbours.
        isDragging && 'relative z-10',
      )}
      {...attributes}
      {...listeners}
    >
      <AssetCard
        asset={asset}
        className={cn(
          'cursor-grab active:cursor-grabbing',
          isDragging && 'cursor-grabbing shadow-[var(--shadow-lifted)]',
        )}
      />
    </div>
  )
}
