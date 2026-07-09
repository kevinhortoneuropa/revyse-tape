import type { Announcements, DragEndEvent, ScreenReaderInstructions } from '@dnd-kit/core'
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { useMemo } from 'react'

import type { CurrencySymbol, QuotedAsset } from '~/lib/domain'

import { SortableAssetCard } from './SortableAssetCard'

export interface AssetGridProps {
  readonly assets: readonly QuotedAsset[]
  readonly onMove: (active: CurrencySymbol, over: CurrencySymbol) => void
  /** Suspends the refresh timer for the duration of a drag. */
  readonly onDragStart?: () => void
  readonly onDragEnd?: () => void
}

const screenReaderInstructions: ScreenReaderInstructions = {
  draggable:
    'Press space or enter to pick up this card. Use the arrow keys to move it. Press space or enter again to drop it, or escape to cancel.',
}

/**
 * The seam between dnd-kit and our domain, extracted so it can be tested
 * without a DOM.
 *
 * dnd-kit's entire contribution to a reorder is these two identifiers, and we
 * set them to symbols. No index crosses this boundary, which is why dragging
 * inside a filtered subset cannot silently reorder the cards the user cannot
 * see. Returns null for a drop outside any card, or onto itself.
 */
export function symbolsFromDragEnd(
  event: Pick<DragEndEvent, 'active' | 'over'>,
): readonly [CurrencySymbol, CurrencySymbol] | null {
  const { active, over } = event
  if (!over || active.id === over.id) return null

  return [String(active.id) as CurrencySymbol, String(over.id) as CurrencySymbol]
}

/**
 * What a screen reader hears during a drag. dnd-kit pipes these into an ARIA
 * live region, which is the difference between drag-and-drop being usable
 * without sight and being invisible.
 */
export const dragAnnouncements: Announcements = {
  onDragStart: ({ active }) => `Picked up ${String(active.id)}.`,
  onDragOver: ({ active, over }) =>
    over ? `${String(active.id)} is over ${String(over.id)}.` : undefined,
  onDragEnd: ({ active, over }) =>
    over
      ? `${String(active.id)} was dropped on ${String(over.id)}.`
      : `${String(active.id)} was returned to its place.`,
  onDragCancel: ({ active }) => `Dragging ${String(active.id)} was cancelled.`,
}

const noop = () => undefined

export function AssetGrid({
  assets,
  onMove,
  onDragStart = noop,
  onDragEnd = noop,
}: AssetGridProps) {
  const symbols = useMemo(() => assets.map((asset) => asset.symbol), [assets])

  const sensors = useSensors(
    // A small activation distance so a click on a card is not read as a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Makes the whole feature keyboard-operable, and — because it needs no
    // pointer coordinates — is the only part of dnd-kit that works in jsdom.
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    onDragEnd()

    const moved = symbolsFromDragEnd(event)
    if (moved) onMove(moved[0], moved[1])
  }

  return (
    <DndContext
      // Without an explicit id, dnd-kit generates one and the server's differs
      // from the client's, producing a hydration mismatch.
      id="asset-grid"
      sensors={sensors}
      collisionDetection={closestCenter}
      // No `restrictToParentElement` modifier: it confines a dragged node to
      // its *own* parent, and each card sits in its own <li>. It pins every
      // drag in place while looking entirely reasonable in review.
      accessibility={{ announcements: dragAnnouncements, screenReaderInstructions }}
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={onDragEnd}
    >
      {/* rectSortingStrategy, not verticalListSortingStrategy: this is a
          two-dimensional grid, and the list strategy only moves cards up and
          down a single column. */}
      <SortableContext items={symbols} strategy={rectSortingStrategy}>
        <ul className="grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => (
            <li key={asset.symbol}>
              <SortableAssetCard asset={asset} />
            </li>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  )
}
