import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, FileDown, ListChecks, XCircle, Hourglass } from 'lucide-react'
import type { Application } from '../types'
import { useStore } from '../lib/store'
import { explain } from '../lib/xai'
import { downloadReport } from '../lib/report'
import { Badge, Button, Card, cn, SeverityBadge } from './ui'

export function OutcomeBadge({ o, className }: { o: 'ACCEPT' | 'REJECT' | 'PENDING'; className?: string }) {
  return o === 'ACCEPT' ? <Badge tone="green" className={cn('px-3 py-1 text-xs', className)}>ACCEPT</Badge>
    : o === 'REJECT' ? <Badge tone="red" className={cn('px-3 py-1 text-xs', className)}>REJECT</Badge>
    : <Badge tone="gray" className={cn('px-3 py-1 text-xs', className)}>VERIFYING</Badge>
}

/** Explainable-AI view: outcome, plain-language paragraph, reasons as points, error summary, factor contributions, SDG alignment. */
export function ExplanationPanel({ app, findingsLink }: { app: Application; findingsLink?: string }) {
  const s = useStore()
  const x = useMemo(() => explain(s, app), [s, app])
  const tone = x.outcome === 'ACCEPT' ? 'ok' : x.outcome === 'REJECT' ? 'bad' : 'muted'
  const Icon = x.outcome === 'ACCEPT' ? CheckCircle2 : x.outcome === 'REJECT' ? XCircle : Hourglass
  const maxAbs = Math.max(1, ...x.factors.map((f) => Math.abs(f.delta)))

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Icon className={cn('mt-0.5 h-9 w-9 shrink-0', `text-${tone}`)} />
            <div>
              <div className="text-xs font-semibold uppercase tracking-widest text-muted">Explainable AI summary</div>
              <h2 className="text-xl font-bold">{x.headline}</h2>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right"><div className="text-xs text-muted">Compliance score</div><div className={cn('text-3xl font-extrabold tabular-nums', `text-${tone}`)}>{x.outcome === 'PENDING' ? '—' : x.score}<span className="text-sm text-muted">/100</span></div></div>
            <Button variant="primary" onClick={() => downloadReport(s, app.id)}><FileDown className="h-4 w-4" /> Generate report</Button>
          </div>
        </div>
        <p className="mt-4 text-[15px] leading-relaxed">{x.paragraph}</p>
        <p className="mt-3 rounded-xl bg-raised px-3 py-2 text-xs text-muted">AI suggests; the authorized officer decides. This explanation is generated from the stored findings, AICTE record checks and infrastructure checks — every point below links back to evidence.</p>
      </Card>

      {x.outcome !== 'PENDING' && (
        <div className="grid gap-4 2xl:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-bad"><XCircle className="h-4 w-4" /> {x.outcome === 'REJECT' ? 'Why it is rejected' : 'Points still open'} <span className="text-xs font-normal text-muted">({x.against.length})</span></h3>
            {x.against.length === 0 ? <p className="text-sm text-muted">Nothing open.</p> : (
              <ol className="space-y-2.5 text-sm">
                {x.against.map((p, i) => (
                  <li key={i} className="rounded-xl bg-raised p-3">
                    <div className="flex flex-wrap items-center gap-2 font-semibold">{p.severity && <SeverityBadge s={p.severity} />}{p.title}{p.ref && (findingsLink ? <Link to={findingsLink} className="font-mono text-[11px] text-brand">{p.ref}</Link> : <span className="font-mono text-[11px] text-muted">{p.ref}</span>)}</div>
                    <p className="mt-1 text-muted">{p.detail}</p>
                    {p.action && <p className="mt-1 text-xs"><b>To fix:</b> {p.action}</p>}
                  </li>
                ))}
              </ol>
            )}
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 flex items-center gap-2 font-semibold text-ok"><CheckCircle2 className="h-4 w-4" /> {x.outcome === 'ACCEPT' ? 'Why it is accepted' : 'What passed'} <span className="text-xs font-normal text-muted">({x.supports.length})</span></h3>
            {x.supports.length === 0 ? <p className="text-sm text-muted">No passing checks recorded.</p> : (
              <ul className="space-y-2.5 text-sm">
                {x.supports.map((p, i) => <li key={i} className="rounded-xl bg-raised p-3"><div className="font-semibold">{p.title}</div><p className="mt-1 text-muted">{p.detail}</p></li>)}
              </ul>
            )}
          </Card>
        </div>
      )}

      {x.outcome !== 'PENDING' && (
        <div className="grid gap-4 2xl:grid-cols-2">
          <Card className="p-4">
            <h3 className="mb-2 font-semibold">Error summary</h3>
            {x.errors.length === 0 ? <p className="text-sm text-muted">No errors to summarise.</p> : (
              <ul className="space-y-2 text-sm">
                {x.errors.map((g) => (
                  <li key={g.category}><div className="flex items-center justify-between font-medium"><span>{g.category}</span><Badge tone="red">{g.count}</Badge></div>
                    <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-muted">{g.items.map((it) => <li key={it}>{it}</li>)}</ul></li>
                ))}
              </ul>
            )}
            {x.nextSteps.length > 0 && <div className="mt-3 border-t border-line pt-3"><div className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><ListChecks className="h-4 w-4" /> What the institution needs to do</div>
              <ol className="list-decimal space-y-0.5 pl-5 text-xs text-muted">{x.nextSteps.map((n) => <li key={n}>{n}</li>)}</ol></div>}
          </Card>
          <Card className="p-4">
            <h3 className="mb-1 font-semibold">What drove the score</h3>
            <p className="mb-3 text-xs text-muted">Start at 100; each factor lowers the score by the amount shown.</p>
            {x.factors.length === 0 ? <p className="text-sm text-muted">No deductions — nothing lowered the score.</p> : (
              <ul className="space-y-2.5 text-sm">
                {x.factors.map((f) => (
                  <li key={f.label}><div className="flex justify-between"><span>{f.label}</span><span className="font-mono text-bad">{f.delta}</span></div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-bad" style={{ width: `${(Math.abs(f.delta) / maxAbs) * 100}%` }} /></div></li>
                ))}
              </ul>
            )}
            <div className="mt-3 text-xs text-muted">{x.counts.verified}/{x.counts.docs} documents verified · {x.counts.unresolved} unresolved · {x.counts.resolved} closed</div>
          </Card>
        </div>
      )}

      <Card className="p-4">
        <h3 className="mb-1 font-semibold">UN Sustainable Development Goals this review supports</h3>
        <p className="mb-3 text-xs text-muted">Technical-education approval contributes to these goals; each card shows how this application’s checks tie in.</p>
        <div className="grid gap-3 xl:grid-cols-3">
          {x.sdg.map((g) => (
            <div key={g.goal} className="rounded-2xl bg-raised p-3 text-sm">
              <div className="mb-1 flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg text-sm font-extrabold text-white" style={{ background: `#${g.color}` }}>{g.goal}</span><span className="font-semibold leading-tight">{g.name}</span></div>
              <div className="mb-1 text-[11px] text-muted">Targets {g.targets.map((t) => t.id).join(', ')}</div>
              <p className="text-xs">{g.why}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
