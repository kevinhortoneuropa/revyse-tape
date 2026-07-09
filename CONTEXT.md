# Crypto Dashboard

A dashboard that displays a set of cryptocurrencies as cards, each showing its price
in USD and in BTC. Users filter the set by name or symbol, and drag cards into an
arrangement that persists across visits.

## Language

### The data

**Asset**:
The identity of a cryptocurrency — its symbol, display name, brand colour, and the
number of decimal places it is conventionally quoted to. Stable; changes only when
Coinbase lists or delists.
_Avoid_: Coin, Currency, Token

**Symbol**:
An Asset's short uppercase ticker code, such as `BTC`. Uniquely identifies an Asset.
_Avoid_: Code, Ticker, Slug

**Catalog**:
The set of Assets that Coinbase classifies as crypto. Membership in the Catalog is
what distinguishes a cryptocurrency from a fiat currency, since both appear in the
Rates map.
_Avoid_: List, Universe, Registry

**Rate**:
A raw Coinbase value expressing how many units of an Asset one US dollar buys. It is
the reciprocal of a price, and is never shown to a user.
_Avoid_: Price, Value

**Quote**:
An Asset's price at a single instant, expressed in both USD and BTC. Derived from
Rates. Replaced wholesale each time the data refreshes.
_Avoid_: Price, Ticker, Rate

### The view

**Ordering**:
The sequence of Symbols describing how a user has arranged their cards. Owned by the
client, never by the server, and never derived from the Catalog's own ordering.
_Avoid_: Order, Sort, Layout, Arrangement

**Filter**:
The text a user types to narrow the visible Assets, matched against Asset name and
Symbol. Lives in the URL, and so is shareable.
_Avoid_: Search, Query
