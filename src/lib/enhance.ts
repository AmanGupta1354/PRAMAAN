// In-browser image enhancement for laboratory / classroom evidence photos (no server, no external API).
export interface EnhanceMetrics { brightness: number; contrast: number; sharpness: number; width: number; height: number }
export interface EnhanceResult { before: string; after: string; mBefore: EnhanceMetrics; mAfter: EnhanceMetrics; steps: string[] }

function toCanvas(img: CanvasImageSource, w: number, h: number) {
  const c = document.createElement('canvas'); c.width = w; c.height = h
  c.getContext('2d', { willReadFrequently: true })!.drawImage(img, 0, 0, w, h)
  return c
}

function metrics(c: HTMLCanvasElement): EnhanceMetrics {
  const w = Math.min(480, c.width), h = Math.max(1, Math.round((c.height / c.width) * w))
  const t = toCanvas(c, w, h), d = t.getContext('2d')!.getImageData(0, 0, w, h).data
  const gray = new Float32Array(w * h)
  let sum = 0
  for (let i = 0; i < w * h; i++) { gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]; sum += gray[i] }
  const mean = sum / (w * h)
  let v = 0, lap = 0, lapSq = 0, n = 0
  for (let i = 0; i < w * h; i++) v += (gray[i] - mean) ** 2
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x, l = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i]
    lap += l; lapSq += l * l; n++
  }
  return { brightness: Math.round(mean), contrast: Math.round(Math.sqrt(v / (w * h))), sharpness: Math.round(lapSq / n - (lap / n) ** 2), width: c.width, height: c.height }
}

/** Auto-levels (1–99 percentile stretch per channel), gamma lift for dark scenes, then unsharp mask. Upscales small photos. */
export async function enhanceImage(src: Blob | string): Promise<EnhanceResult> {
  const url = typeof src === 'string' ? src : URL.createObjectURL(src)
  const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Image could not be decoded')); i.src = url })
  if (typeof src !== 'string') URL.revokeObjectURL(url)
  const steps: string[] = []
  const MAXW = 1600
  let w = img.naturalWidth, h = img.naturalHeight
  if (w > MAXW) { h = Math.round((h * MAXW) / w); w = MAXW }
  const orig = toCanvas(img, w, h)
  const mBefore = metrics(orig)

  let out = orig
  if (Math.min(w, h) < 700) {
    const k = 2
    const up = document.createElement('canvas'); up.width = w * k; up.height = h * k
    const g = up.getContext('2d', { willReadFrequently: true })!; g.imageSmoothingQuality = 'high'; g.drawImage(orig, 0, 0, up.width, up.height)
    out = up; steps.push(`Upscaled ${k}× (${w}×${h} → ${up.width}×${up.height}) for readability`)
  }
  const ctx = out.getContext('2d', { willReadFrequently: true })!
  const id = ctx.getImageData(0, 0, out.width, out.height), d = id.data

  // 1) auto-levels per channel
  const lo = [0, 0, 0], hi = [255, 255, 255]
  for (let ch = 0; ch < 3; ch++) {
    const hist = new Uint32Array(256)
    for (let i = ch; i < d.length; i += 4) hist[d[i]]++
    const total = d.length / 4
    let acc = 0
    for (let v = 0; v < 256; v++) { acc += hist[v]; if (acc >= total * 0.01) { lo[ch] = v; break } }
    acc = 0
    for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc >= total * 0.01) { hi[ch] = v; break } }
    if (hi[ch] - lo[ch] < 20) { lo[ch] = 0; hi[ch] = 255 }
  }
  // 2) gamma so that the mean lands near mid-grey for dark images
  let gamma = 1
  if (mBefore.brightness < 105) { gamma = Math.min(1.9, Math.max(1.1, Math.log(0.5) / Math.log(Math.max(0.12, mBefore.brightness / 255)))); steps.push(`Brightened dark scene (gamma ${gamma.toFixed(2)})`) }
  else if (mBefore.brightness > 190) { gamma = 0.8; steps.push('Reduced over-exposure (gamma 0.80)') }
  const lut = [0, 1, 2].map((ch) => { const a = new Uint8ClampedArray(256); for (let v = 0; v < 256; v++) a[v] = 255 * Math.pow(Math.min(1, Math.max(0, (v - lo[ch]) / (hi[ch] - lo[ch]))), 1 / gamma); return a })
  for (let i = 0; i < d.length; i += 4) { d[i] = lut[0][d[i]]; d[i + 1] = lut[1][d[i + 1]]; d[i + 2] = lut[2][d[i + 2]] }
  steps.push(`Auto-contrast stretch (R ${lo[0]}–${hi[0]}, G ${lo[1]}–${hi[1]}, B ${lo[2]}–${hi[2]})`)
  ctx.putImageData(id, 0, 0)

  // 3) unsharp mask: sharpened = orig + amount * (orig - blurred)
  const blur = document.createElement('canvas'); blur.width = out.width; blur.height = out.height
  const bg = blur.getContext('2d', { willReadFrequently: true })!
  bg.filter = `blur(${Math.max(1, Math.round(out.width / 900))}px)`; bg.drawImage(out, 0, 0)
  const bd = bg.getImageData(0, 0, out.width, out.height).data
  const sd = ctx.getImageData(0, 0, out.width, out.height), p = sd.data
  const amount = 1.1
  for (let i = 0; i < p.length; i += 4) for (let c = 0; c < 3; c++) p[i + c] = Math.max(0, Math.min(255, p[i + c] + amount * (p[i + c] - bd[i + c])))
  ctx.putImageData(sd, 0, 0)
  steps.push('Sharpened edges (unsharp mask) so text and equipment labels are easier to read')

  const mAfter = metrics(out)
  return { before: orig.toDataURL('image/jpeg', 0.9), after: out.toDataURL('image/jpeg', 0.92), mBefore, mAfter, steps }
}

/** A deliberately dim, soft, low-contrast synthetic "laboratory" so the enhancement can be demonstrated without a real photo. */
export function syntheticLabPhoto(): string {
  const c = document.createElement('canvas'); c.width = 640; c.height = 400
  const g = c.getContext('2d')!
  g.fillStyle = '#9aa7b8'; g.fillRect(0, 0, 640, 400)
  g.fillStyle = '#7d8798'; g.fillRect(0, 250, 640, 150)
  for (let i = 0; i < 4; i++) { g.fillStyle = '#5b6575'; g.fillRect(40 + i * 150, 230, 120, 18); g.fillStyle = '#4a5260'; g.fillRect(50 + i * 150, 248, 10, 110); g.fillRect(140 + i * 150, 248, 10, 110) }
  for (let i = 0; i < 4; i++) { g.fillStyle = '#3d6b8c'; g.fillRect(65 + i * 150, 170, 70, 55); g.fillStyle = '#c7d3dd'; g.fillRect(72 + i * 150, 178, 56, 34) }
  g.fillStyle = '#6b7686'; g.fillRect(40, 40, 260, 90); g.fillStyle = '#aab4c2'; g.font = 'bold 26px Arial'; g.fillText('PHYSICS LAB 2', 60, 95)
  const t = document.createElement('canvas'); t.width = 640; t.height = 400
  const tg = t.getContext('2d')!
  tg.filter = 'blur(2.2px) brightness(0.48) contrast(0.7)'; tg.drawImage(c, 0, 0)
  return t.toDataURL('image/jpeg', 0.9)
}
