import { useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown, Lightbulb, ShieldQuestion } from 'lucide-react'
import type { DocRecord, ExtractedValue, Finding } from '../types'
import { fmtDateTime } from '../lib/format'
import { Badge, CheckBadge, cn, FindingBadge, SeverityBadge, SimTag, StrengthBadge } from './ui'

export function FindingCard({ f, doc, value, controls, defaultOpen, selected, onSelect }: {
  f: Finding; doc?: DocRecord; value?: ExtractedValue; controls?: ReactNode; defaultOpen?: boolean; selected?: boolean; onSelect?: () => void
}) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className={cn('rounded-2xl border bg-surface transition', selected ? 'border-accent' : 'border-line', f.severity === 'HIGH' && f.status !== 'RESOLVED' && f.status !== 'DISMISSED' && 'border-l-4 border-l-bad')}>
      <button className="flex w-full items-start gap-3 p-3 text-left" aria-expanded={open} onClick={() => { setOpen((o) => !o); onSelect?.() }}>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted">{f.id}</span><SeverityBadge s={f.severity} /><CheckBadge s={f.verdict} /><FindingBadge s={f.status} />
            {f.simulated && <SimTag>Simulated</SimTag>}
          </div>
          <div className="mt-1 font-semibold">{f.title}</div>
          <p className="mt-0.5 text-sm text-muted">{f.description}</p>
        </div>
        <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-muted transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="space-y-3 border-t border-line p-3 text-sm">
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs sm:grid-cols-3">
                <div><dt className="text-muted">Rule / clause</dt><dd className="font-medium">{f.rule}</dd></div>
                <div><dt className="text-muted">Check ID</dt><dd className="font-mono">{f.checkId}</dd></div>
                <div><dt className="text-muted">Document</dt><dd className="font-medium">{doc ? `${doc.name}${f.page ? `, page ${f.page}` : ''}` : '—'}</dd></div>
                <div><dt className="text-muted">Confidence</dt><dd className="font-medium">{f.confidence !== undefined ? `${Math.round(f.confidence * 100)}%` : 'n/a'}</dd></div>
                <div><dt className="text-muted">Verification source</dt><dd className="font-medium">{f.source}</dd></div>
                <div><dt className="text-muted">Verification strength</dt><dd><StrengthBadge s={f.strength} simulated={f.simulated} /></dd></div>
              </dl>
              <div>
                <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">Evidence</div>
                <ul className="space-y-1 text-xs">{f.evidence.map((e) => <li key={e} className="rounded-lg bg-raised px-2 py-1.5">{e}</li>)}</ul>
              </div>
              {value && !value.confirmed && (
                <div className="flex items-start gap-2 rounded-lg border border-warn/40 bg-warn/10 p-2 text-xs"><ShieldQuestion className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
                  <span>Gate 2: “{value.field}” = <b>{value.value}</b> was extracted at {Math.round(value.confidence * 100)}%. A human must confirm it before this finding can be decided.</span></div>
              )}
              <div className="flex items-start gap-2 rounded-lg bg-accent/10 p-2 text-xs"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-accent" /><span><b>Suggested action:</b> {f.action}</span></div>
              {f.decision && (
                <div className="rounded-lg border border-line p-2 text-xs"><Badge tone="blue">Decision</Badge> {f.decision.action.replace('_', ' ').toLowerCase()} by <b>{f.decision.by}</b> · {fmtDateTime(f.decision.at)}
                  {f.decision.reason && <div className="mt-1 text-muted">Reason: {f.decision.reason}</div>}</div>
              )}
              {controls}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
