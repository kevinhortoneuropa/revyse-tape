import { Card } from '~/components/ui/Card'
import { cn } from '~/components/ui/cn'
import type { QuotedAsset } from '~/lib/domain'
import { formatBtc, formatUsd } from '~/lib/money/format'

export interface AssetCardProps {
  readonly asset: QuotedAsset
  readonly className?: string
}

/**
 * A brand-coloured monogram rather than a logo.
 *
 * Coinbase's documented catalog gives us `color`; the logo lives only on an
 * undocumented endpoint. A monogram costs no image request, cannot 404, and
 * causes no layout shift.
 */
function Monogram({ symbol, color }: { readonly symbol: string; readonly color: string }) {
  return (
    <span
      aria-hidden
      className="grid size-9 shrink-0 place-items-center rounded-full text-[11px] font-bold text-white"
      style={{ backgroundColor: color }}
    >
      {symbol.slice(0, 3)}
    </span>
  )
}

export function AssetCard({ asset, className }: AssetCardProps) {
  return (
    <Card
      data-symbol={asset.symbol}
      className={cn('flex flex-col gap-3 transition-shadow', className)}
    >
      <div className="flex items-center gap-3">
        <Monogram symbol={asset.symbol} color={asset.color} />
        <div className="min-w-0">
          {/* truncate: "Bitcoin Cash" must not wrap the card at 320px. */}
          <p className="truncate font-medium leading-tight">{asset.name}</p>
          <p className="text-xs font-medium uppercase tracking-wide text-muted">{asset.symbol}</p>
        </div>
      </div>

      {/* A definition list: dt/dd map to term/definition, so a screen reader
          pairs each price with its unit instead of reading two bare numbers.
          (An aria-label here would be ignored — <dl> itself has no ARIA role.) */}
      <dl className="mt-auto space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted">USD</dt>
          <dd className="tabular text-lg font-semibold leading-none">{formatUsd(asset.usd)}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2">
          <dt className="text-xs text-muted">BTC</dt>
          <dd className="tabular text-xs text-muted">{formatBtc(asset.btc)}</dd>
        </div>
      </dl>
    </Card>
  )
}
