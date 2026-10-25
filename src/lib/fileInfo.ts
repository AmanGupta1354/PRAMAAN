import type { FileMeta } from './store'
import { sha256Bytes } from './hash'
import { EXT_FORMATS, MAX_FILE_BYTES } from '../data/catalog'

// Object URLs for browser-local previews. Never persisted; lost on refresh (metadata survives).
const previews = new Map<string, string>()
export const setPreview = (docId: string, url: string) => previews.set(docId, url)
export const getPreview = (docId: string) => previews.get(docId)

export function validateFile(file: File, formats: string[]): string | null {
  if (file.size === 0) return 'The file is empty.'
  if (file.size > MAX_FILE_BYTES) return `File exceeds the ${MAX_FILE_BYTES / 1048576} MB limit.`
  const ext = file.name.split('.').pop()?.toUpperCase() ?? ''
  const norm = ext === 'JPEG' ? 'JPG' : ext
  const okMime = formats.some((f) => EXT_FORMATS[f]?.includes(file.type))
  if (!formats.includes(norm) || !okMime) return `Accepted formats: ${formats.join(', ')}. Got ${file.type || 'unknown type'}.`
  return null
}

export async function analyzeFile(file: File): Promise<{ meta: FileMeta; warnings: string[]; previewUrl: string }> {
  const buf = new Uint8Array(await file.arrayBuffer())
  const warnings: string[] = []
  const meta: FileMeta = { fileName: file.name, size: file.size, mime: file.type, fingerprint: sha256Bytes(buf), source: 'BROWSER_UPLOAD' }
  if (file.type === 'application/pdf') {
    const head = new TextDecoder('latin1').decode(buf.slice(0, 8))
    if (!head.startsWith('%PDF-')) throw new Error('File claims to be a PDF but has no %PDF header. It was not accepted.')
    const text = new TextDecoder('latin1').decode(buf)
    const n = (text.match(/\/Type\s*\/Page(?![s\w])/g) ?? []).length
    if (n > 0) meta.pages = n
    else warnings.push('Page count could not be determined (compressed object streams).')
  } else {
    const url = URL.createObjectURL(file)
    await new Promise<void>((res) => {
      const img = new Image()
      img.onload = () => { meta.width = img.naturalWidth; meta.height = img.naturalHeight; res() }
      img.onerror = () => { warnings.push('Image could not be decoded.'); res() }
      img.src = url
    })
    URL.revokeObjectURL(url)
    if (meta.width && meta.height && Math.min(meta.width, meta.height) < 800) warnings.push(`Low resolution (${meta.width}×${meta.height}); a rescan may be requested.`)
    meta.pages = 1
  }
  return { meta, warnings, previewUrl: URL.createObjectURL(file) }
}

/** Labelled synthetic sample that can be "uploaded" without choosing a file. */
export function demoSample(reqKey: string, variant = 1, formats: string[] = ['PDF']): FileMeta {
  const img = !formats.includes('PDF')
  const fp = sha256Bytes(new TextEncoder().encode(`demo-sample:${reqKey}:${variant}`))
  return { fileName: `DEMO_SAMPLE_${reqKey}_v${variant}.${img ? 'png' : 'pdf'}`, size: 220_000 + variant * 18_431, mime: img ? 'image/png' : 'application/pdf', fingerprint: fp, pages: img ? 1 : 3 + variant, source: 'DEMO_SAMPLE' }
}
