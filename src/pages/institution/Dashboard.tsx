import { Link } from 'react-router-dom'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { CalendarClock, FilePlus2 } from 'lucide-react'
import { useStore } from '../../lib/store'
import { STATUS_GROUPS, useMyApps, useMyInstitution } from '../../lib/hooks'
import { APP_TYPE_LABEL, daysUntil, fmtDate, fmtDateTime } from '../../lib/format'
import { AppBadge, Card, LinkButton, PageHeader, Stat, SimTag } from '../../components/ui'

const COLORS = ['#94a3b8', '#60a5fa', '#fbbf24', '#f87171', '#34d399']

export default function InstDashboard() {
  const s = useStore()
  const apps = useMyApps()
  const inst = useMyInstitution()
  const count = (k: string) => apps.filter((a) => STATUS_GROUPS[k].set.includes(a.status)).length
  const expiring = s.docs
    .filter((d) => apps.some((a) => a.id === d.appId) && d.expiresOn)
    .map((d) => ({ d, days: daysUntil(d.expiresOn)! }))
    .filter((x) => x.days <= 120).sort((a, b) => a.days - b.days)
  const notes = s.notifications.filter((n) => n.instId === inst?.id).slice(0, 5)
  const recent = [...apps].sort((a, b) => (b.timeline.at(-1)?.at ?? '').localeCompare(a.timeline.at(-1)?.at ?? '')).slice(0, 5)
  const pie = Object.keys(STATUS_GROUPS).map((k, i) => ({ name: STATUS_GROUPS[k].label, value: count(k), fill: COLORS[i] })).filter((x) => x.value > 0)

  return (
    <>
      <PageHeader title={inst?.name ?? 'Institution'} sub={`${inst?.city}, ${inst?.state} · ${inst?.id} · Academic session 2026-27 · Synthetic institution`}
        actions={<LinkButton to="/institution/applications/new" variant="primary"><FilePlus2 className="h-4 w-4" /> New application</LinkButton>} />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat label="Total" value={apps.length} to="/institution/applications" />
        <Stat label="Draft" value={count('draft')} tone="gray" to="/institution/applications?status=draft" />
        <Stat label="Verifying" value={count('verifying')} tone="cyan" to="/institution/applications?status=verifying" />
        <Stat label="Officer review" value={count('review')} tone="amber" to="/institution/applications?status=review" />
        <Stat label="Rectification" value={count('rectify')} tone="red" to="/institution/applications?status=rectify" />
        <Stat label="Checks completed" value={count('completed')} tone="green" to="/institution/applications?status=completed" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-1">
          <h2 className="mb-2 font-semibold">Applications by stage</h2>
          <div className="h-52" role="img" aria-label="Pie chart of applications by stage">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pie} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3} stroke="none">{pie.map((p) => <Cell key={p.name} fill={p.fill} />)}</Pie>
                <Tooltip contentStyle={{ background: 'rgb(var(--surface))', border: 'none', boxShadow: 'var(--neu-out-sm)', borderRadius: 12, color: 'rgb(var(--fg))' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">{pie.map((p) => <li key={p.name}><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ background: p.fill }} />{p.name} ({p.value})</li>)}</ul>
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><CalendarClock className="h-4 w-4 text-warn" /> Upcoming certificate expirations</h2>
          {expiring.length === 0 ? <p className="text-sm text-muted">No certificates expiring within 120 days.</p> : (
            <ul className="space-y-2 text-sm">
              {expiring.slice(0, 5).map(({ d, days }) => (
                <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl bg-raised px-3 py-2">
                  <span className="min-w-0"><span className="block truncate font-medium">{d.name}</span><span className="text-xs text-muted">{d.appId} · {fmtDate(d.expiresOn)}</span></span>
                  <span className={days < 0 ? 'text-bad' : 'text-warn'}>{days < 0 ? `${-days}d overdue` : `${days}d left`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">Recent notifications</h2><Link to="/institution/notifications" className="text-xs text-brand">View all</Link></div>
          <ul className="space-y-2 text-sm">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl bg-raised px-3 py-2"><div className="flex items-center gap-2 font-medium">{!n.read && <span className="h-2 w-2 rounded-full bg-warn" />}{n.title}</div><div className="text-xs text-muted">{n.body}</div></li>
            ))}
          </ul>
          <div className="mt-2"><SimTag>Messaging simulator — nothing is sent</SimTag></div>
        </Card>
      </div>

      <Card className="mt-6 p-4">
        <h2 className="mb-3 font-semibold">Recent application activity</h2>
        <div className="divide-y divide-line">
          {recent.map((a) => (
            <Link key={a.id} to={`/institution/applications/${a.id}`} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm hover:text-brand">
              <span><span className="font-mono text-xs text-muted">{a.id}</span> · {APP_TYPE_LABEL[a.type]}<span className="block text-xs text-muted">{a.timeline.at(-1)?.label} · {fmtDateTime(a.timeline.at(-1)?.at)}</span></span>
              <AppBadge s={a.status} />
            </Link>
          ))}
        </div>
      </Card>
    </>
  )
}
