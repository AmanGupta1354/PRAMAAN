import type { DocRecord, ExtractedValue } from '../types'
import { getPreview } from '../lib/fileInfo'
import { cn, SimTag } from './ui'
import { fmtSize } from '../lib/format'

// Highlight regions for seeded samples (percent of page box).
const REGIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  'Expiry date': { x: 8, y: 62, w: 52, h: 7 }, 'Certificate number': { x: 8, y: 34, w: 50, h: 7 },
  'Faculty count': { x: 8, y: 48, w: 46, h: 7 }, 'Declared built-up area': { x: 8, y: 48, w: 52, h: 7 },
  'Institution name': { x: 8, y: 22, w: 70, h: 7 }, 'Student intake': { x: 8, y: 62, w: 40, h: 7 }, 'Reference number': { x: 8, y: 34, w: 46, h: 7 },
}

export function DocPreview({ doc, page = 1, highlight, scan, fields, className }: {
  doc: DocRecord; page?: number; highlight?: string; scan?: boolean; fields?: ExtractedValue[]; className?: string
}) {
  const url = getPreview(doc.id)
  const region = highlight ? REGIONS[highlight] : undefined
  return (
    <div className={cn('relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-line bg-white text-slate-700 shadow-card', className)}>
      {url && doc.mime.startsWith('image/') && <img src={url} alt={`Preview of ${doc.fileName}`} className="h-full w-full object-contain" />}
      {url && doc.mime === 'application/pdf' && <iframe title={`Preview of ${doc.fileName}`} src={url} className="h-full w-full" />}
      {!url && (
        <div className="absolute inset-0 p-[8%] text-[9px] leading-tight">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1.5">
            <b className="text-[10px] tracking-wide text-slate-900">{doc.name.toUpperCase()}</b>
            <span className="text-slate-500">Page {page}{doc.pages ? `/${doc.pages}` : ''}</span>
          </div>
          <div className="mt-[6%] space-y-[3.4%]">
            {(fields?.length ? fields.map((f) => [f.field, f.value]) : [['Institution', 'Synthetic institution'], ['Reference', doc.id], ['Valid until', doc.expiresOn ? new Date(doc.expiresOn).toLocaleDateString('en-IN') : '—']]).slice(0, 4).map(([k, v], i) => (
              <div key={i} className="flex gap-2"><span className="w-[34%] text-slate-500">{k}</span><span className="font-semibold text-slate-800">{v}</span></div>
            ))}
            {[90, 78, 84, 60, 88, 70].map((w, i) => <div key={i} className="h-[3px] rounded bg-slate-200" style={{ width: `${w}%` }} />)}
          </div>
          <div className="absolute inset-x-[8%] bottom-[6%] flex items-end justify-between text-slate-400">
            <span>SYNTHETIC SAMPLE — NOT A REAL DOCUMENT</span><span className="h-8 w-8 rounded-full border-2 border-slate-300" />
          </div>
        </div>
      )}
      {region && !url && (
        <div className="absolute rounded border-2 border-accent bg-accent/15" style={{ left: `${region.x}%`, top: `${region.y}%`, width: `${region.w}%`, height: `${region.h}%` }}>
          <span className="absolute -top-4 left-0 rounded bg-accent px-1 text-[8px] font-bold text-black">{highlight}</span>
        </div>
      )}
      {scan && <div className="scanline" />}
    </div>
  )
}

export function DocMeta({ doc }: { doc: DocRecord }) {
  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
      <dt className="text-muted">File</dt><dd className="truncate font-medium" title={doc.fileName}>{doc.fileName}</dd>
      <dt className="text-muted">Size</dt><dd>{fmtSize(doc.size)}</dd>
      <dt className="text-muted">Pages</dt><dd>{doc.pages ?? '—'}</dd>
      <dt className="text-muted">Version</dt><dd>v{doc.version}</dd>
      <dt className="text-muted">SHA-256</dt><dd className="truncate font-mono" title={doc.fingerprint}>{doc.fingerprint.slice(0, 16)}…</dd>
      <dt className="text-muted">Origin</dt>
      <dd>{doc.source === 'BROWSER_UPLOAD' ? <SimTag>Browser-local upload</SimTag> : doc.source === 'DEMO_SAMPLE' ? <SimTag>Demo sample</SimTag> : <SimTag>Seeded sample</SimTag>}</dd>
    </dl>
  )
}
