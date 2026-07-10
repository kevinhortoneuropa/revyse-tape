import type { IconComponent } from '@web3icons/react'
import TokenADA from '@web3icons/react/icons/tokens/TokenADA'
import TokenAVAX from '@web3icons/react/icons/tokens/TokenAVAX'
import TokenBCH from '@web3icons/react/icons/tokens/TokenBCH'
import TokenBTC from '@web3icons/react/icons/tokens/TokenBTC'
import TokenDOGE from '@web3icons/react/icons/tokens/TokenDOGE'
import TokenDOT from '@web3icons/react/icons/tokens/TokenDOT'
import TokenETH from '@web3icons/react/icons/tokens/TokenETH'
import TokenLINK from '@web3icons/react/icons/tokens/TokenLINK'
import TokenLTC from '@web3icons/react/icons/tokens/TokenLTC'
import TokenSOL from '@web3icons/react/icons/tokens/TokenSOL'
import TokenUNI from '@web3icons/react/icons/tokens/TokenUNI'
import TokenXRP from '@web3icons/react/icons/tokens/TokenXRP'

import type { TRACKED_SYMBOLS } from '~/lib/coinbase/assets'
import type { CurrencySymbol } from '~/lib/domain'

/**
 * Subpath imports, not the `@web3icons/react` barrel: the barrel re-exports
 * several thousand icon modules, which Vite would crawl on every dev cold
 * start and Rollup would have to tree-shake on every build. Importing the
 * twelve files we render keeps both graphs the size of the dashboard.
 *
 * Each icon is inline SVG path data compiled into the bundle — no image
 * request, cannot 404, no layout shift. Those are the properties the old
 * monogram was chosen for; the library keeps them and adds the real mark.
 *
 * `satisfies` makes the map provably total over the tracked set: adding a
 * symbol to `TRACKED_SYMBOLS` without adding its icon is a compile error,
 * not a silent fallback discovered in production.
 */
const ICONS = {
  ADA: TokenADA,
  AVAX: TokenAVAX,
  BCH: TokenBCH,
  BTC: TokenBTC,
  DOGE: TokenDOGE,
  DOT: TokenDOT,
  ETH: TokenETH,
  LINK: TokenLINK,
  LTC: TokenLTC,
  SOL: TokenSOL,
  UNI: TokenUNI,
  XRP: TokenXRP,
} satisfies Record<(typeof TRACKED_SYMBOLS)[number], IconComponent>

const iconBySymbol: ReadonlyMap<string, IconComponent> = new Map(Object.entries(ICONS))

/**
 * The fallback when a symbol arrives that the map does not know. The compile
 * gate above covers `TRACKED_SYMBOLS`, but symbols are runtime data from the
 * server, so the lookup must still be total.
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

export interface TokenIconProps {
  readonly symbol: CurrencySymbol
  /** Coinbase's brand colour — only the monogram fallback needs it. */
  readonly color: string
}

/**
 * Decorative in both branches: the symbol is announced by the text beside it,
 * so the icon is `aria-hidden` rather than labelled twice.
 */
export function TokenIcon({ symbol, color }: TokenIconProps) {
  const Icon = iconBySymbol.get(symbol)
  if (!Icon) return <Monogram symbol={symbol} color={color} />

  return (
    <Icon
      aria-hidden
      variant="background"
      size={36}
      className="size-9 shrink-0 rounded-full"
      data-token-icon={symbol}
    />
  )
}
