/**
 * Fixtures mirroring real `api.coinbase.com` payloads, trimmed to what we read.
 *
 * The rates map deliberately keeps fiat entries (AED, ALL) alongside crypto:
 * the real endpoint returns 635 mixed keys, and excluding fiat structurally —
 * by joining against the crypto catalog — is a behaviour worth testing.
 */

export const catalogFixture = {
  data: [
    { asset_id: 'a', code: 'BTC', name: 'Bitcoin', color: '#F7931A', sort_index: 100, exponent: 8 },
    {
      asset_id: 'b',
      code: 'ETH',
      name: 'Ethereum',
      color: '#627EEA',
      sort_index: 101,
      exponent: 8,
    },
    {
      asset_id: 'c',
      code: 'LTC',
      name: 'Litecoin',
      color: '#A6A9AA',
      sort_index: 102,
      exponent: 8,
    },
    {
      asset_id: 'd',
      code: 'BCH',
      name: 'Bitcoin Cash',
      color: '#8DC351',
      sort_index: 103,
      exponent: 8,
    },
    { asset_id: 'e', code: 'XRP', name: 'XRP', color: '#222222', sort_index: 109, exponent: 6 },
    {
      asset_id: 'f',
      code: 'LINK',
      name: 'Chainlink',
      color: '#0667D0',
      sort_index: 112,
      exponent: 8,
    },
    { asset_id: 'g', code: 'UNI', name: 'Uniswap', color: '#FF007A', sort_index: 126, exponent: 8 },
    { asset_id: 'h', code: 'ADA', name: 'Cardano', color: '#3CC8C8', sort_index: 138, exponent: 6 },
    {
      asset_id: 'i',
      code: 'DOGE',
      name: 'Dogecoin',
      color: '#C3A634',
      sort_index: 151,
      exponent: 8,
    },
    {
      asset_id: 'j',
      code: 'DOT',
      name: 'Polkadot',
      color: '#E6007A',
      sort_index: 155,
      exponent: 10,
    },
    { asset_id: 'k', code: 'SOL', name: 'Solana', color: '#DC1FFF', sort_index: 156, exponent: 9 },
    {
      asset_id: 'l',
      code: 'AVAX',
      name: 'Avalanche',
      color: '#E84142',
      sort_index: 175,
      exponent: 8,
    },
    // Not tracked; must be ignored rather than rendered.
    { asset_id: 'm', code: 'ZEC', name: 'Zcash', color: '#ECB244', sort_index: 108, exponent: 8 },
  ],
}

export const ratesFixture = {
  data: {
    currency: 'USD',
    rates: {
      // Real values, units per 1 USD.
      BTC: '0.000015819488249',
      ETH: '0.0005728426744879',
      SOL: '0.0128172263522174',
      XRP: '0.9115770282588879',
      ADA: '5.9880239520958084',
      DOGE: '13.6649357748018584',
      AVAX: '0.1490312965722802',
      LINK: '0.1288493750805309',
      DOT: '1.2121212121212121',
      LTC: '0.0227427791676143',
      BCH: '0.0042099945270071',
      UNI: '0.2936857562408223',
      ZEC: '0.0234192037470725',
      // Fiat. Present in the real response; must never reach a card.
      AED: '3.6730233333333333',
      ALL: '82.0525',
    },
  },
}
