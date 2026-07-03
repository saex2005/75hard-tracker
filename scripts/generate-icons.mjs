import { writeFileSync, mkdirSync } from 'fs'
import { deflateSync } from 'zlib'

// CRC-32
const crcTable = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xFFFFFFFF
  for (const b of buf) c = crcTable[(c ^ b) & 0xFF] ^ (c >>> 8)
  return ((c ^ 0xFFFFFFFF) >>> 0)
}
function chunk(type, data) {
  const t = Buffer.from(type)
  const len = Buffer.allocUnsafe(4)
  len.writeUInt32BE(data.length)
  const crc = Buffer.allocUnsafe(4)
  crc.writeUInt32BE(crc32(Buffer.concat([t, data])))
  return Buffer.concat([len, t, data, crc])
}
function makePNG(w, h, pixels) {
  const ihdr = Buffer.from([
    0,0,0,0, 0,0,0,0, 8, 6, 0, 0, 0
  ])
  ihdr.writeUInt32BE(w, 0)
  ihdr.writeUInt32BE(h, 4)
  const rows = []
  for (let y = 0; y < h; y++) {
    rows.push(0)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4
      rows.push(pixels[i], pixels[i+1], pixels[i+2], pixels[i+3])
    }
  }
  const raw = deflateSync(Buffer.from(rows))
  return Buffer.concat([
    Buffer.from([137,80,78,71,13,10,26,10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', raw),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// Pixel font 5×7 para cada dígito (0=off, 1=on)
const DIGITS = {
  '7': [
    [1,1,1,1,1],
    [0,0,0,0,1],
    [0,0,0,1,0],
    [0,0,1,0,0],
    [0,1,0,0,0],
    [0,1,0,0,0],
    [0,1,0,0,0],
  ],
  '5': [
    [1,1,1,1,1],
    [1,0,0,0,0],
    [1,0,0,0,0],
    [1,1,1,1,0],
    [0,0,0,0,1],
    [0,0,0,0,1],
    [1,1,1,1,0],
  ],
}

function setPixel(px, w, x, y, r, g, b, a = 255) {
  if (x < 0 || x >= w || y < 0 || y >= w) return
  const i = (y * w + x) * 4
  px[i] = r; px[i+1] = g; px[i+2] = b; px[i+3] = a
}

function drawRect(px, w, x0, y0, x1, y1, r, g, b) {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      setPixel(px, w, x, y, r, g, b)
}

function drawCircleAA(px, w, cx, cy, radius, thickness, r, g, b) {
  const inner = radius - thickness / 2
  const outer = radius + thickness / 2
  for (let y = 0; y < w; y++) {
    for (let x = 0; x < w; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2)
      if (d >= inner && d <= outer) {
        const edge = Math.min(d - inner, outer - d)
        const alpha = Math.min(1, edge) * 255 | 0
        const i = (y * w + x) * 4
        const bg_r = px[i], bg_g = px[i+1], bg_b = px[i+2]
        const t = alpha / 255
        px[i]   = (bg_r * (1 - t) + r * t) | 0
        px[i+1] = (bg_g * (1 - t) + g * t) | 0
        px[i+2] = (bg_b * (1 - t) + b * t) | 0
        px[i+3] = 255
      }
    }
  }
}

function drawDigit(px, size, digit, startX, startY, scale, r, g, b) {
  const bitmap = DIGITS[digit]
  for (let row = 0; row < bitmap.length; row++) {
    for (let col = 0; col < bitmap[row].length; col++) {
      if (bitmap[row][col]) {
        drawRect(
          px, size,
          startX + col * scale,
          startY + row * scale,
          startX + col * scale + scale - 1,
          startY + row * scale + scale - 1,
          r, g, b
        )
      }
    }
  }
}

function generate(size, outPath) {
  const px = new Uint8Array(size * size * 4)

  const cx = size / 2
  const cy = size / 2

  // Fondo #0A0A0A
  for (let i = 0; i < size * size * 4; i += 4) {
    px[i] = 10; px[i+1] = 10; px[i+2] = 10; px[i+3] = 255
  }

  // Anillo naranja exterior
  const ringR = size * 0.43
  const ringT = size * 0.055
  drawCircleAA(px, size, cx, cy, ringR, ringT, 249, 115, 22)

  // Digitos "75" en pixel art centrados
  // Cada dígito: 5×7 px * scale, separados por 1*scale
  const scale = Math.max(2, Math.round(size / 40))
  const digitW = 5 * scale
  const digitH = 7 * scale
  const gap = scale * 2
  const totalW = digitW * 2 + gap
  const totalH = digitH

  const startX = Math.round(cx - totalW / 2)
  const startY = Math.round(cy - totalH / 2)

  drawDigit(px, size, '7', startX, startY, scale, 249, 115, 22)
  drawDigit(px, size, '5', startX + digitW + gap, startY, scale, 249, 115, 22)

  mkdirSync(outPath.split('/').slice(0, -1).join('/'), { recursive: true })
  writeFileSync(outPath, makePNG(size, size, px))
  console.log(`✓ ${outPath} (${size}×${size})`)
}

generate(192, 'public/icons/icon-192.png')
generate(512, 'public/icons/icon-512.png')
