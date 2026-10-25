import type { CheckStatus, DocRecord, Severity } from '../types'

/** Real, in-browser document analysis: pdf.js (metadata, text layer, structure) + Tesseract.js (OCR) + blur estimate. */
export interface FieldHit { field: string; value: string; page: number; confidence: number; via: 'TEXT_LAYER' | 'OCR' }
export interface DeepAnalysis {
  at: string; engine: string
  pdf?: { producer?: string; creator?: string; created?: string; modified?: string; pages: number; textChars: number; hiddenItems: number; eofCount: number; encrypted: boolean; hasScript: boolean }
  ocr?: { used: boolean; confidence?: number; chars: number }
  blur?: number // Laplacian variance of the first page / image (higher = sharper)
  fields: FieldHit[]
  expiresOn?: string
  error?: string
}

const withTimeout = <T,>(p: Promise<T>, ms: number): Promise<T | undefined> => new Promise((res) => { const t = setTimeout(() => res(undefined), ms); p.then((v) => { clearTimeout(t); res(v) }, () => { clearTimeout(t); res(undefined) }) })

const pdfDate = (s?: string) => {
  const m = s?.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/)
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 0), +(m[5] ?? 0), +(m[6] ?? 0))).toISOString() : undefined
}

function parseDate(d: string, m: string, y: string) {
  const dt = new Date(Date.UTC(+y, +m - 1, +d))
  return Number.isNaN(dt.getTime()) || +m > 12 || +d > 31 ? undefined : dt.toISOString()
}

export function extractFields(text: string, page: number, conf: number, via: FieldHit['via']): { fields: FieldHit[]; expiresOn?: string } {
  const fields: FieldHit[] = []
  const add = (field: string, value: string) => fields.push({ field, value, page, confidence: conf, via })
  let expiresOn: string | undefined
  const exp = text.match(/(?:valid\s*(?:up\s*)?(?:to|till|until|upto)|expir\w*(?:\s*date)?|validity)[^\d]{0,20}(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i)
  if (exp) { expiresOn = parseDate(exp[1], exp[2], exp[3]); add('Expiry date', `${exp[1]}/${exp[2]}/${exp[3]}`) }
  const iss = text.match(/(?:issued?|dated?|date of issue)[^\d]{0,20}(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/i)
  if (iss) add('Issue date', `${iss[1]}/${iss[2]}/${iss[3]}`)
  const no = text.match(/(?:certificate|cert\.?|reference|ref\.?|licen[cs]e|registration|file|approval)\s*(?:no\.?|number|#)[\s:.\-]*((?=[A-Z0-9/\-]*\d)[A-Z0-9][A-Z0-9/\-]{4,})/i)
  if (no) add('Certificate number', no[1])
  const inst = text.split(/\r?\n/).map((l) => l.trim()).find((l) => /\b(institute|college|university|polytechnic|school)\b/i.test(l) && l.length < 90)
  if (inst) add('Institution name', inst)
  const area = text.match(/(\d[\d,.]*)\s*(?:sq\.?\s*m(?:etres?|eters?)?|sqm|square\s*met)/i)
  if (area) add('Declared built-up area', `${area[1]} sq m`)
  const fac = text.match(/faculty[^\d]{0,25}(\d{1,4})/i)
  if (fac) add('Faculty count', fac[1])
  const intake = text.match(/intake[^\d]{0,25}(\d{1,4})/i)
  if (intake) add('Student intake', intake[1])
  return { fields, expiresOn }
}

/** Laplacian variance on a downscaled grayscale copy; <60 is typically visibly soft. */
function blurScore(canvas: HTMLCanvasElement): number {
  const w = 480, h = Math.max(1, Math.round((canvas.height / canvas.width) * 480))
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.drawImage(canvas, 0, 0, w, h)
  const d = g.getImageData(0, 0, w, h).data
  const gray = new Float32Array(w * h)
  for (let i = 0; i < w * h; i++) gray[i] = 0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]
  let sum = 0, sq = 0, n = 0
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    const i = y * w + x
    const l = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i]
    sum += l; sq += l * l; n++
  }
  const mean = sum / n
  return Math.round(sq / n - mean * mean)
}

async function ocrCanvas(source: HTMLCanvasElement | Blob, onStatus?: (s: string) => void) {
  const { createWorker } = await import('tesseract.js')
  const worker = await createWorker('eng', 1, { workerPath: '/tesseract/worker.min.js', corePath: '/tesseract/', langPath: '/tesseract/', gzip: true, logger: (m: { status: string; progress: number }) => onStatus?.(`OCR: ${m.status} ${Math.round(m.progress * 100)}%`) })
  try {
    const r = await worker.recognize(source as never)
    return { text: r.data.text, confidence: r.data.confidence / 100 }
  } finally { await worker.terminate() }
}

export async function deepAnalyze(file: File, onStatus?: (s: string) => void): Promise<DeepAnalysis> {
  const out: DeepAnalysis = { at: new Date().toISOString(), engine: 'pdf.js + Tesseract.js (in-browser)', fields: [] }
  try {
    if (file.type === 'application/pdf') {
      onStatus?.('Reading PDF structure…')
      const bytes = new Uint8Array(await file.arrayBuffer())
      const raw = new TextDecoder('latin1').decode(bytes)
      const pdfjs = await import('pdfjs-dist')
      pdfjs.GlobalWorkerOptions.workerSrc = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default
      const doc = await pdfjs.getDocument({ data: bytes.slice() }).promise
      const meta = await doc.getMetadata().catch(() => null)
      const info = (meta?.info ?? {}) as Record<string, string>
      let textChars = 0, hidden = 0, firstText = ''
      const limit = Math.min(doc.numPages, 10)
      for (let p = 1; p <= limit; p++) {
        const page = await doc.getPage(p)
        const vp = page.getViewport({ scale: 1 })
        const tc = await page.getTextContent()
        let pageText = ''
        for (const it of tc.items as { str: string; height: number; transform: number[] }[]) {
          if (!it.str?.trim()) continue
          pageText += it.str + ' '
          textChars += it.str.length
          const [, , , , x, y] = it.transform
          if (Math.abs(it.height) < 2 || x < -5 || y < -5 || x > vp.width + 5 || y > vp.height + 5) hidden++
        }
        if (p === 1) firstText = pageText
        if (pageText.trim()) {
          const r = extractFields(pageText.replace(/\s{2,}/g, '\n'), p, 0.99, 'TEXT_LAYER')
          out.fields.push(...r.fields.filter((f) => !out.fields.some((e) => e.field === f.field)))
          out.expiresOn ??= r.expiresOn
        }
      }
      out.pdf = {
        producer: info.Producer, creator: info.Creator, created: pdfDate(info.CreationDate), modified: pdfDate(info.ModDate),
        pages: doc.numPages, textChars, hiddenItems: hidden, eofCount: (raw.match(/%%EOF/g) ?? []).length,
        encrypted: /\/Encrypt\b/.test(raw), hasScript: /\/(JavaScript|JS)\b/.test(raw),
      }
      // Render page 1 for the blur estimate (and OCR when there is no text layer)
      const p1 = await doc.getPage(1)
      const vp = p1.getViewport({ scale: 1.6 })
      const canvas = document.createElement('canvas'); canvas.width = vp.width; canvas.height = vp.height
      const rendered = await withTimeout(p1.render({ canvasContext: canvas.getContext('2d')!, viewport: vp }).promise.then(() => true), 12000)
      if (rendered) out.blur = blurScore(canvas)
      if (firstText.trim().length < 30 && rendered) {
        onStatus?.('No text layer — running OCR (first run downloads the language data)…')
        const o = await ocrCanvas(canvas, onStatus)
        out.ocr = { used: true, confidence: o.confidence, chars: o.text.length }
        const r = extractFields(o.text, 1, Math.max(0.3, o.confidence - 0.05), 'OCR')
        out.fields.push(...r.fields); out.expiresOn ??= r.expiresOn
      } else out.ocr = { used: false, chars: 0 }
    } else {
      onStatus?.('Preparing image…')
      const url = URL.createObjectURL(file)
      const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Image could not be decoded')); i.src = url })
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      URL.revokeObjectURL(url)
      out.blur = blurScore(canvas)
      onStatus?.('Running OCR (first run downloads the language data)…')
      const o = await ocrCanvas(file, onStatus)
      out.ocr = { used: true, confidence: o.confidence, chars: o.text.length }
      const r = extractFields(o.text, 1, Math.max(0.3, o.confidence - 0.05), 'OCR')
      out.fields = r.fields; out.expiresOn = r.expiresOn
    }
  } catch (e) {
    out.error = e instanceof Error ? e.message : 'Analysis failed'
  }
  return out
}

export interface RealFlag {
  checkId: string; title: string; severity: Severity; verdict: CheckStatus; rule: string; description: string
  evidence: string[]; docId: string; page?: number; confidence?: number; action: string
}

/** Findings derived only from real in-browser analysis results. */
export function realFlags(docs: DocRecord[]): RealFlag[] {
  const out: RealFlag[] = []
  for (const d of docs) {
    const a = d.analysis
    if (!a || a.error) continue
    const base = { docId: d.id }
    if (a.pdf && a.pdf.hiddenItems > 0)
      out.push({ ...base, checkId: 'CHK-FOR-HIDDEN', title: 'Hidden or off-page text detected', severity: 'MEDIUM', verdict: 'MANUAL_REQUIRED', rule: 'R-FOR-01 · Handbook §10.1', page: 1, confidence: 0.8,
        description: `${a.pdf.hiddenItems} text item(s) in “${d.name}” are tiny or positioned outside the page. This is an indicator for review, not proof of tampering.`,
        evidence: [`pdf.js found ${a.pdf.hiddenItems} text run(s) smaller than 2pt or outside the page box`, 'Computed in your browser'], action: 'Officer review of the document; request the original issuer-signed copy if needed.' })
    if (a.pdf && a.pdf.eofCount > 1)
      out.push({ ...base, checkId: 'CHK-FOR-STRUCT', title: 'Document saved with incremental updates', severity: 'LOW', verdict: 'MANUAL_REQUIRED', rule: 'R-FOR-02 · Handbook §10.2', confidence: 0.7,
        description: `“${d.name}” contains ${a.pdf.eofCount} end-of-file markers, meaning it was edited and re-saved after creation. Many legitimate workflows do this.`,
        evidence: [`${a.pdf.eofCount} × %%EOF markers in the file`, a.pdf.producer ? `Producer: ${a.pdf.producer}` : 'No producer recorded'], action: 'Compare with the issuer’s original if the content is in doubt.' })
    if (a.pdf?.created && a.pdf.modified && new Date(a.pdf.modified).getTime() - new Date(a.pdf.created).getTime() > 86400000)
      out.push({ ...base, checkId: 'CHK-FOR-META', title: 'Modified long after creation', severity: 'LOW', verdict: 'MANUAL_REQUIRED', rule: 'R-FOR-03 · Handbook §10.2', confidence: 0.6,
        description: `Metadata shows “${d.name}” was modified more than a day after it was created.`,
        evidence: [`Created ${a.pdf.created.slice(0, 10)}`, `Modified ${a.pdf.modified.slice(0, 10)}`], action: 'Ask the institution to explain the modification if relevant.' })
    if (a.blur !== undefined && a.blur < 60)
      out.push({ ...base, checkId: 'CHK-QUALITY', title: 'Page appears blurry', severity: 'LOW', verdict: 'MANUAL_REQUIRED', rule: 'R-QLT-01 · Handbook §2.4', page: 1, confidence: 0.75,
        description: `Sharpness score ${a.blur} (Laplacian variance) is below the readability threshold of 60.`, evidence: [`Measured sharpness ${a.blur} on page 1`], action: 'Rescan at 300 DPI or higher and re-upload.' })
    if (a.expiresOn && new Date(a.expiresOn) < new Date())
      out.push({ ...base, checkId: 'CHK-EXPIRY', title: 'Expiry date in the past', severity: 'HIGH', verdict: 'EXPIRED', rule: 'R-FIRE-01 · Handbook §4.3.2', page: 1, confidence: a.fields.find((f) => f.field === 'Expiry date')?.confidence ?? 0.7,
        description: `The expiry date read from “${d.name}” (${a.expiresOn.slice(0, 10)}) has passed.`,
        evidence: [`Expiry date extracted via ${a.fields.find((f) => f.field === 'Expiry date')?.via === 'OCR' ? 'OCR' : 'the text layer'}: ${a.expiresOn.slice(0, 10)}`], action: 'Upload a renewed certificate valid on the submission date.' })
  }
  return out
}
