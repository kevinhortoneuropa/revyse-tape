import { mkdirSync, writeFileSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

/**
 * Generates the favicon set from source. No ImageMagick, no sharp, no canvas —
 * just `node:zlib` and the PNG/ICO byte layouts.
 *
 * The icons are generated rather than pasted so the letterform and the brand
 * colour are derived from the same tokens the app uses, and so a reviewer can
 * see exactly where a binary in the repo came from.
 *
 *   npm run icons:generate
 */

// ---------------------------------------------------------------------------
// Colour. The same oklch values as `--l-accent` / `--l-accent-foreground` and
// `--d-accent` / `--d-accent-foreground` in app/app.css, converted to sRGB
// because PNG has no idea what oklch is.
// ---------------------------------------------------------------------------

const LIGHT = { bg: [0.55, 0.19, 258], fg: [0.99, 0, 0] }
const DARK = { bg: [0.68, 0.16, 258], fg: [0.17, 0.015, 265] }

/** oklch -> oklab -> linear sRGB -> sRGB. */
function oklchToRgb([l, c, hDeg]) {
  const h = (hDeg * Math.PI) / 180
  const a = c * Math.cos(h)
  const b = c * Math.sin(h)

  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3

  const lin = [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]

  const gamma = (v) => (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055)
  return lin.map((v) => Math.max(0, Math.min(255, Math.round(gamma(v) * 255))))
}

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')}`

// ---------------------------------------------------------------------------
// The letter R, defined once in a 24x24 design space as three strokes, so the
// SVG and the rasteriser draw exactly the same glyph.
// ---------------------------------------------------------------------------

// The bowl's inner edge must sit clear of the stem's right edge, or the counter
// (the hole in the R) closes and the glyph renders as a blob:
//   stem right edge = STEM.x + STROKE/2          = 7.6
//   bowl inner edge = BOWL.cx + BOWL.rx - STROKE = 10.4
const STROKE = 3.2
const STEM = { x: 6, y1: 4, y2: 20 }
const BOWL = { cx: 6, cy: 9, rx: 7.6, ry: 5 }
const LEG = { x1: 8.6, y1: 13.2, x2: 16.4, y2: 20 }

/** Distance from p to the segment ab. */
function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax
  const dy = by - ay
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

/**
 * Approximate distance to the right half of an elliptical ring.
 *
 * `|k - 1| * min(rx, ry)` is the tempting shortcut and it is badly wrong when
 * the ellipse is eccentric — it collapses the whole interior into the stroke and
 * the R loses its counter. Divide by the gradient of k instead, which is the
 * standard first-order distance estimate.
 */
function distToBowl(px, py) {
  if (px < BOWL.cx) return Infinity

  const nx = (px - BOWL.cx) / BOWL.rx
  const ny = (py - BOWL.cy) / BOWL.ry
  const k = Math.hypot(nx, ny)
  if (k === 0) return Infinity

  const gradient = Math.hypot(nx / BOWL.rx, ny / BOWL.ry) / k
  return Math.abs(k - 1) / gradient
}

/** Signed coverage of the glyph at a point in the 24x24 design space. */
const insideGlyph = (x, y) =>
  distToSegment(x, y, STEM.x, STEM.y1, STEM.x, STEM.y2) <= STROKE / 2 ||
  distToBowl(x, y) <= STROKE / 2 ||
  distToSegment(x, y, LEG.x1, LEG.y1, LEG.x2, LEG.y2) <= STROKE / 2

/** Rounded-square background, so the icon reads as a tile rather than a blob. */
function insideBackground(x, y) {
  const r = 5
  const dx = Math.abs(x - 12) - (12 - r)
  const dy = Math.abs(y - 12) - (12 - r)
  return Math.min(Math.max(dx, dy), 0) + Math.hypot(Math.max(dx, 0), Math.max(dy, 0)) <= r
}

const SUPERSAMPLE = 4

/** Render the icon at `size`px into an RGBA buffer, antialiased by supersampling. */
function render(size, { bg, fg }, { opaque = false } = {}) {
  const [br, bgc, bb] = oklchToRgb(bg)
  const [fr, fgc, fb] = oklchToRgb(fg)
  const rgba = Buffer.alloc(size * size * 4)

  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let bgHits = 0
      let fgHits = 0

      for (let sy = 0; sy < SUPERSAMPLE; sy += 1) {
        for (let sx = 0; sx < SUPERSAMPLE; sx += 1) {
          const x = ((px + (sx + 0.5) / SUPERSAMPLE) / size) * 24
          const y = ((py + (sy + 0.5) / SUPERSAMPLE) / size) * 24
          if (insideBackground(x, y)) bgHits += 1
          if (insideGlyph(x, y)) fgHits += 1
        }
      }

      const total = SUPERSAMPLE * SUPERSAMPLE
      const bgA = opaque ? 1 : bgHits / total
      const fgA = Math.min(fgHits / total, bgA)

      // Composite the glyph over the tile, then the tile over transparency.
      const i = (py * size + px) * 4
      const alpha = bgA
      rgba[i] = Math.round(br * (1 - fgA / (alpha || 1)) + fr * (fgA / (alpha || 1)))
      rgba[i + 1] = Math.round(bgc * (1 - fgA / (alpha || 1)) + fgc * (fgA / (alpha || 1)))
      rgba[i + 2] = Math.round(bb * (1 - fgA / (alpha || 1)) + fb * (fgA / (alpha || 1)))
      rgba[i + 3] = Math.round(alpha * 255)
    }
  }

  return rgba
}

// ---------------------------------------------------------------------------
// PNG. Signature, then length(4,BE) + type(4) + data + crc32(type+data)(4,BE).
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buf) {
  let c = 0xffffffff
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)

  const typeBuf = Buffer.from(type, 'ascii')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)

  return Buffer.concat([length, typeBuf, data, crc])
}

function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // colour type: truecolour + alpha
  ihdr[10] = 0 // deflate
  ihdr[11] = 0 // adaptive filtering
  ihdr[12] = 0 // no interlacing

  // Each scanline is prefixed with its filter type. 0 = None.
  const raw = Buffer.alloc(size * (1 + size * 4))
  for (let y = 0; y < size; y += 1) {
    raw[y * (1 + size * 4)] = 0
    rgba.copy(raw, y * (1 + size * 4) + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ---------------------------------------------------------------------------
// ICO. Little-endian, unlike PNG. Since Windows Vista an entry's payload may be
// a whole PNG file rather than a headerless BMP, and every current browser
// accepts that.
// ---------------------------------------------------------------------------

function encodeIco(images) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0) // reserved
  header.writeUInt16LE(1, 2) // 1 = icon
  header.writeUInt16LE(images.length, 4)

  let offset = 6 + 16 * images.length
  const entries = images.map(({ size, png }) => {
    const entry = Buffer.alloc(16)
    entry[0] = size === 256 ? 0 : size // 0 means 256
    entry[1] = size === 256 ? 0 : size
    entry[2] = 0 // not paletted
    entry[3] = 0 // reserved
    entry.writeUInt16LE(1, 4) // colour planes
    entry.writeUInt16LE(32, 6) // bits per pixel
    entry.writeUInt32LE(png.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += png.length
    return entry
  })

  return Buffer.concat([header, ...entries, ...images.map((i) => i.png)])
}

// ---------------------------------------------------------------------------
// SVG. Same three strokes, so it is the same letterform — plus the one thing a
// raster icon cannot do: follow the OS colour scheme, live, without a reload.
// ---------------------------------------------------------------------------

function encodeSvg() {
  const arc = `M${STEM.x} ${STEM.y1} A${BOWL.rx} ${BOWL.ry} 0 0 1 ${STEM.x} ${BOWL.cy + BOWL.ry}`

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <style>
    :root { --bg: ${hex(oklchToRgb(LIGHT.bg))}; --fg: ${hex(oklchToRgb(LIGHT.fg))}; }
    @media (prefers-color-scheme: dark) {
      :root { --bg: ${hex(oklchToRgb(DARK.bg))}; --fg: ${hex(oklchToRgb(DARK.fg))}; }
    }
  </style>
  <rect width="24" height="24" rx="5" fill="var(--bg)"/>
  <g stroke="var(--fg)" stroke-width="${STROKE}" stroke-linecap="round" fill="none">
    <path d="M${STEM.x} ${STEM.y1}V${STEM.y2}"/>
    <path d="${arc}"/>
    <path d="M${LEG.x1} ${LEG.y1}L${LEG.x2} ${LEG.y2}"/>
  </g>
</svg>
`
}

// ---------------------------------------------------------------------------

mkdirSync('public', { recursive: true })

const ico = encodeIco([32, 48].map((size) => ({ size, png: encodePng(size, render(size, LIGHT)) })))
writeFileSync('public/favicon.ico', ico)

writeFileSync('public/favicon.svg', encodeSvg())

// iOS masks the corners itself and refuses transparency, so this one is opaque.
writeFileSync('public/apple-touch-icon.png', encodePng(180, render(180, LIGHT, { opaque: true })))

console.log('wrote public/favicon.ico, public/favicon.svg, public/apple-touch-icon.png')
