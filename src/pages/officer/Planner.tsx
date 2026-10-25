import { Link } from 'react-router-dom'
import { useStore } from '../../lib/store'
import { appStats } from '../../lib/derive'
import { Callout, Card, PageHeader, Progress } from '../../components/ui'

export default function Planner() {
  const s = useStore()
  const rows = s.institutions.map((inst) => {
    const apps = s.apps.filter((a) => a.instId === inst.id)
    const st = apps.map((a) => appStats(s, a))
    const open = st.reduce((n, x) => n + x.open, 0)
    const high = st.reduce((n, x) => n + x.high, 0)
    const expired = st.reduce((n, x) => n + x.expired, 0)
    const total = apps.reduce((n, a) => n + s.findings.filter((f) => f.appId === a.id).length, 0)
    const dupFac = s.faculty.filter((f) => f.instId === inst.id && s.faculty.some((o) => o.instId !== inst.id && o.photoHash === f.photoHash)).length
    const score = high * 10 + (open - high) * 3 + expired * 5 + Math.max(0, total - open) + dupFac * 4
    return { inst, apps, open, high, expired, repeated: total, dupFac, score }
  }).sort((a, b) => b.score - a.score)
  const max = Math.max(1, ...rows.map((r) => r.score))
  return (
    <>
      <PageHeader title="Inspection planner" sub="Synthetic institutions ranked by open findings, expired documents and repeated discrepancies." />
      <Callout tone="amber" title="Advisory demo prioritisation">This ranking is a transparent score (high×10, other open×3, expired×5, resolved/dismissed history×1, duplicate-faculty candidates×4). It does not trigger inspections. Officers decide.</Callout>
      <Card className="mt-5 divide-y divide-line">
        {rows.map((r, i) => (
          <div key={r.inst.id} className="grid items-center gap-3 p-3 sm:grid-cols-[2rem_1fr_12rem_auto]">
            <span className="font-mono text-sm text-muted">#{i + 1}</span>
            <div><div className="font-semibold">{r.inst.name}</div><div className="text-xs text-muted">{r.inst.city}, {r.inst.state} · {r.apps.length} application(s) · {r.open} open ({r.high} high) · {r.expired} expired doc(s) · {r.dupFac} duplicate-faculty candidate(s)</div></div>
            <div><Progress value={(r.score / max) * 100} tone={r.high ? 'red' : r.open ? 'amber' : 'green'} /><div className="mt-0.5 text-[11px] text-muted">Advisory score {r.score}</div></div>
            {r.apps.find((a) => a.status !== 'DRAFT') ? <Link className="text-xs text-brand" to={`/officer/review/${r.apps.find((a) => a.status !== 'DRAFT')!.id}`}>Open latest</Link> : <span className="text-xs text-muted">No submissions</span>}
          </div>
        ))}
      </Card>
    </>
  )
}
