import type { DocRecord } from '../types'
import { fmtDate, fmtDateTime, fmtSize } from '../lib/format'
import { Badge, Callout, Empty } from './ui'

export function VersionCompare({ docs }: { docs: DocRecord[] }) {
  const changed = docs.filter((d) => d.history.length > 1)
  if (!changed.length) return <Empty title="No replaced documents yet" body="When a document is replaced during rectification, a metadata comparison between versions appears here." />
  return (
    <div className="space-y-4">
      <Callout tone="amber" title="Simulated comparison">Field-level content differences are simulated. File name, size, page count, fingerprint and expiry are taken from the stored version records in this browser.</Callout>
      {changed.map((d) => {
        const a = d.history[d.history.length - 2], b = d.history[d.history.length - 1]
        const rows: [string, string, string][] = [
          ['File name', a.fileName, b.fileName], ['Size', fmtSize(a.size), fmtSize(b.size)], ['Pages', String(a.pages ?? '—'), String(b.pages ?? '—')],
          ['SHA-256', a.fingerprint.slice(0, 20) + '…', b.fingerprint.slice(0, 20) + '…'], ['Uploaded', fmtDateTime(a.uploadedAt), fmtDateTime(b.uploadedAt)],
          ['Expiry (extracted)', fmtDate(a.expiresOn), fmtDate(d.expiresOn)],
        ]
        return (
          <div key={d.id} className="overflow-hidden rounded-2xl border border-line">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-raised px-3 py-2 text-sm font-semibold">{d.name}<span className="text-xs font-normal text-muted">v{a.version} → v{b.version}{d.needsRerun && <Badge tone="cyan" className="ml-2">Re-check pending</Badge>}</span></div>
            <table className="w-full text-xs"><thead className="text-left text-muted"><tr><th className="px-3 py-1.5">Field</th><th>Previous</th><th>Current</th></tr></thead>
              <tbody className="divide-y divide-line">{rows.map(([k, x, y]) => (
                <tr key={k} className={x !== y ? 'bg-warn/5' : ''}><td className="px-3 py-1.5 text-muted">{k}</td><td className={x !== y ? 'text-bad line-through' : ''}>{x}</td><td className={x !== y ? 'font-semibold text-ok' : ''}>{y}</td></tr>
              ))}</tbody></table>
            {b.note && <div className="border-t border-line px-3 py-2 text-xs text-muted">Institution note: {b.note}</div>}
          </div>
        )
      })}
    </div>
  )
}
