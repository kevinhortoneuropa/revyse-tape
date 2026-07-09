import { createServer } from 'node:http'

/**
 * A stand-in for api.coinbase.com, used by the end-to-end suite.
 *
 * The real fetch happens inside the Remix loader, on the server, so Playwright's
 * request interception cannot reach it — page.route only sees traffic the
 * *browser* makes. Pointing the app at this server instead is the only way to
 * make prices deterministic, which is what lets a test assert on card order
 * rather than merely on "some cards exist".
 *
 * BTC's price moves on every request so a refresh is observable.
 */

const PORT = Number(process.env.MOCK_COINBASE_PORT ?? 4010)

const ASSETS = [
  ['BTC', 'Bitcoin', '#F7931A'],
  ['ETH', 'Ethereum', '#627EEA'],
  ['SOL', 'Solana', '#DC1FFF'],
  ['XRP', 'XRP', '#222222'],
  ['ADA', 'Cardano', '#3CC8C8'],
  ['DOGE', 'Dogecoin', '#C3A634'],
  ['AVAX', 'Avalanche', '#E84142'],
  ['LINK', 'Chainlink', '#0667D0'],
  ['DOT', 'Polkadot', '#E6007A'],
  ['LTC', 'Litecoin', '#A6A9AA'],
  ['BCH', 'Bitcoin Cash', '#8DC351'],
  ['UNI', 'Uniswap', '#FF007A'],
]

/** Units of the asset per 1 USD — the same inverted shape the real API uses. */
const RATES = {
  ETH: '0.0005728426744879',
  SOL: '0.0128172263522174',
  XRP: '0.9115770282588879',
  ADA: '5.9880239520958084',
  DOGE: '13.664935774801858',
  AVAX: '0.1490312965722802',
  LINK: '0.1288493750805309',
  DOT: '1.2121212121212121',
  LTC: '0.0227427791676143',
  BCH: '0.0042099945270071',
  UNI: '0.2936857562408223',
  // Fiat, as the real endpoint returns. Must never reach a card.
  AED: '3.6730233333333333',
  ALL: '82.0525',
}

let requestCount = 0

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://localhost:${String(PORT)}`)

  const send = (body) => {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify(body))
  }

  if (url.pathname === '/v2/currencies/crypto') {
    return send({
      data: ASSETS.map(([code, name, color], index) => ({
        asset_id: code,
        code,
        name,
        color,
        sort_index: 100 + index,
        exponent: 8,
      })),
    })
  }

  if (url.pathname === '/v2/exchange-rates') {
    requestCount += 1
    // Nudge BTC each call so "Refresh" produces a visibly different price.
    const btcRate = 0.000015819488249 * (1 + requestCount / 1000)

    return send({
      data: { currency: 'USD', rates: { BTC: btcRate.toFixed(18), ...RATES } },
    })
  }

  response.writeHead(404, { 'content-type': 'application/json' })
  response.end(JSON.stringify({ errors: [{ id: 'not_found' }] }))
})

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[mock-coinbase] listening on http://localhost:${String(PORT)}`)
})
