import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useStore } from '../../lib/store'
import { appStats, REVIEW_STATES } from '../../lib/derive'
import { CHECK_LABEL, daysUntil, fmtDateTime } from '../../lib/format'
import { AnimatedNumber, Card, FindingBadge, PageHeader, SimTag, Stat } from '../../components/ui'
import type { CheckStatus } from '../../types'

const COLOR: Record<CheckStatus, string> = { VERIFIED: '#34d399', MISMATCH: '#f87171', EXPIRED: '#ef4444', NOT_FOUND: '#fbbf24', UNAVAILABLE: '#94a3b8', MANUAL_REQUIRED: '#f59e0b', PENDING: '#64748b' }

export default function OfficerDashboard() {
  const s = useStore()
  const awaiting = s.apps.filter((a) => (REVIEW_STATES as readonly string[]).includes(a.status))
  const processing = s.apps.filter((a) => a.status === 'SUBMITTED' || a.status === 'PROCESSING')
  const highOpen = s.findings.filter((f) => f.severity === 'HIGH' && f.status !== 'DISMISSED' && f.status !== 'RESOLVED')
  const manual = s.docs.filter((d) => d.status === 'MANUAL_REQUIRED')
  const expiring = s.docs.filter((d) => d.expiresOn && (daysUntil(d.expiresOn) ?? 999) <= 60)
  const reviewed = s.apps.filter((a) => a.status === 'RECOMMENDATION_RECORDED')
  const outcomes = (Object.keys(COLOR) as CheckStatus[]).map((k) => ({ name: CHECK_LABEL[k], key: k, value: s.docs.filter((d) => d.status === k).length })).filter((x) => x.value)
  const hrs = s.apps.filter((a) => a.submittedAt && a.lastRunAt).map((a) => (new Date(a.lastRunAt!).getTime() - new Date(a.submittedAt!).getTime()) / 3600000)
  const avg = hrs.length ? Math.abs(hrs.reduce((x, y) => x + y, 0) / hrs.length) : 0
  const decisions = s.findings.filter((f) => f.decision && f.decision.by !== 'PRAMAAN re-check (simulated)').sort((a, b) => b.decision!.at.localeCompare(a.decision!.at)).slice(0, 6)
  const top = [...awaiting].sort((a, b) => appStats(s, b).priority - appStats(s, a).priority).slice(0, 5)

  return (
    <>
      <PageHeader title="Officer dashboard" sub={<>All figures are derived from the seeded demo store. <SimTag>Illustrative — not AICTE operational statistics</SimTag></>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Awaiting review" value={<AnimatedNumber value={awaiting.length} />} tone="amber" to="/officer/queue?group=review" />
        <Stat label="Processing" value={<AnimatedNumber value={processing.length} />} tone="cyan" to="/officer/queue?group=processing" />
        <Stat label="Open high severity" value={<AnimatedNumber value={highOpen.length} />} tone="red" to="/officer/queue?severity=HIGH" />
        <Stat label="Manual verification" value={<AnimatedNumber value={manual.length} />} hint="documents" tone="amber" />
        <Stat label="Expiring ≤ 60d" value={<AnimatedNumber value={expiring.length} />} hint="certificates" tone="red" />
        <Stat label="Recommended" value={<AnimatedNumber value={reviewed.length} />} tone="green" to="/officer/queue?status=RECOMMENDATION_RECORDED" />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-2 font-semibold">Verification outcomes (documents)</h2>
          <div className="h-60" role="img" aria-label="Bar chart of document verification outcomes">
            <ResponsiveContainer><BarChart data={outcomes}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgb(150 160 180 / .35)" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#6b7690', fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fill: '#6b7690', fontSize: 11 }} />
              <Tooltip cursor={{ fill: 'rgb(255 255 255 / .05)' }} contentStyle={{ background: 'rgb(var(--surface))', border: 'none', boxShadow: 'var(--neu-out-sm)', borderRadius: 12, color: 'rgb(var(--fg))' }} />
              <Bar dataKey="value" radius={[6, 6, 0, 0]}>{outcomes.map((o) => <Cell key={o.key} fill={COLOR[o.key]} />)}</Bar>
            </BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="font-semibold">Average processing time</h2>
          <div className="mt-2 text-4xl font-extrabold tabular-nums">{avg ? avg.toFixed(1) : '—'}<span className="text-lg text-muted"> h</span></div>
          <p className="mt-1 text-xs text-muted">Mean gap between submission and verification completion across seeded applications. Demo value.</p>
          <h3 className="mb-2 mt-5 text-sm font-semibold">Highest-priority cases (advisory)</h3>
          <ul className="space-y-1.5 text-sm">{top.map((a) => <li key={a.id}><Link className="flex justify-between rounded-lg bg-raised px-2 py-1.5 hover:text-brand" to={`/officer/review/${a.id}`}><span className="font-mono text-xs">{a.id}</span><span className="text-xs text-muted">{appStats(s, a).high} high · {appStats(s, a).open} open</span></Link></li>)}</ul>
        </Card>
      </div>
      <Card className="mt-6 p-4">
        <h2 className="mb-3 font-semibold">Recent officer decisions</h2>
        {decisions.length === 0 ? <p className="text-sm text-muted">No decisions recorded yet.</p> : (
          <ul className="divide-y divide-line text-sm">{decisions.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><span><Link to={`/officer/review/${f.appId}?tab=findings`} className="font-mono text-xs text-brand">{f.appId}</Link> · {f.title}<span className="block text-xs text-muted">{f.decision!.by} · {fmtDateTime(f.decision!.at)}</span></span><FindingBadge s={f.status} /></li>))}</ul>
        )}
      </Card>
    </>
  )
}
