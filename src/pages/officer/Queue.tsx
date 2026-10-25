import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Search } from 'lucide-react'
import { useStore } from '../../lib/store'
import { appStats, REVIEW_STATES } from '../../lib/derive'
import { APP_STATUS_LABEL, APP_TYPE_LABEL, fmtDate } from '../../lib/format'
import type { AppStatus, AppType } from '../../types'
import { AppBadge, Card, Empty, inputCls, PageHeader, SeverityBadge, Td, Th } from '../../components/ui'

const PAGE = 10
export default function Queue() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const g = (k: string) => params.get(k) ?? ''
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p); setPage(0) }
  const sort = g('sort') || 'priority'
  const dir = g('dir') || 'desc'

  const rows = useMemo(() => {
    const list = s.apps.filter((a) => a.status !== 'DRAFT').map((a) => ({ a, inst: s.institutions.find((i) => i.id === a.instId)!, st: appStats(s, a) }))
      .filter(({ a, inst, st }) =>
        (!q || a.id.toLowerCase().includes(q.toLowerCase()) || inst.name.toLowerCase().includes(q.toLowerCase())) &&
        (!g('type') || a.type === g('type')) && (!g('state') || inst.state === g('state')) && (!g('status') || a.status === g('status')) &&
        (!g('severity') || st.maxSev === g('severity')) &&
        (g('group') !== 'review' || (REVIEW_STATES as readonly string[]).includes(a.status)) &&
        (g('group') !== 'processing' || a.status === 'SUBMITTED' || a.status === 'PROCESSING') &&
        (!g('from') || (a.submittedAt ?? '') >= g('from')))
    list.sort((x, y) => {
      const v = sort === 'date' ? (x.a.submittedAt ?? '').localeCompare(y.a.submittedAt ?? '') : x.st.priority - y.st.priority
      return dir === 'asc' ? v : -v
    })
    return list
  }, [s, q, params, sort, dir]) // eslint-disable-line react-hooks/exhaustive-deps
  const states = [...new Set(s.institutions.map((i) => i.state))].sort()
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const view = rows.slice(page * PAGE, page * PAGE + PAGE)
  const toggleSort = (k: string) => { const p = new URLSearchParams(params); if (sort === k) p.set('dir', dir === 'asc' ? 'desc' : 'asc'); else { p.set('sort', k); p.set('dir', 'desc') } setParams(p) }

  return (
    <>
      <PageHeader title="Work queue" sub="Submitted applications. Priority is an advisory score from open findings — officers decide what to review." />
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-6">
        <div className="relative col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><input aria-label="Search by application ID or institution" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search application ID or institution" className={`${inputCls} pl-9`} /></div>
        <select aria-label="Application type" value={g('type')} onChange={(e) => set('type', e.target.value)} className={inputCls}><option value="">All types</option>{(Object.keys(APP_TYPE_LABEL) as AppType[]).map((t) => <option key={t} value={t}>{APP_TYPE_LABEL[t]}</option>)}</select>
        <select aria-label="State" value={g('state')} onChange={(e) => set('state', e.target.value)} className={inputCls}><option value="">All states</option>{states.map((x) => <option key={x}>{x}</option>)}</select>
        <select aria-label="Status" value={g('status')} onChange={(e) => set('status', e.target.value)} className={inputCls}><option value="">All statuses</option>{(Object.keys(APP_STATUS_LABEL) as AppStatus[]).filter((x) => x !== 'DRAFT').map((x) => <option key={x} value={x}>{APP_STATUS_LABEL[x]}</option>)}</select>
        <select aria-label="Severity" value={g('severity')} onChange={(e) => set('severity', e.target.value)} className={inputCls}><option value="">Any severity</option><option value="HIGH">High open</option><option value="MEDIUM">Medium open</option><option value="LOW">Low open</option></select>
        <label className="flex items-center gap-2 text-xs text-muted">Submitted after<input type="date" value={g('from')} onChange={(e) => set('from', e.target.value)} className={inputCls} /></label>
        {(g('group') || params.size > 0) && <button className="text-left text-xs text-brand" onClick={() => { setParams({}); setQ('') }}>Clear filters</button>}
      </div>
      {rows.length === 0 ? <Empty title="No applications match these filters" action={<button className="text-sm text-brand" onClick={() => { setParams({}); setQ('') }}>Clear filters</button>} /> : (
        <>
        <div className="space-y-3 md:hidden">
          {view.map(({ a, inst, st }) => (
            <button key={a.id} onClick={() => nav(`/officer/review/${a.id}`)} className="block w-full rounded-3xl bg-surface p-4 text-left">
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-brand">{a.id}</span><AppBadge s={a.status} /></div>
              <div className="mt-1 font-semibold">{inst.name}</div>
              <div className="text-xs text-muted">{inst.city}, {inst.state} · {APP_TYPE_LABEL[a.type]} · {fmtDate(a.submittedAt)}</div>
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">{st.maxSev ? <SeverityBadge s={st.maxSev} /> : <span>No open findings</span>}{st.open} open · score {st.priority}</div>
            </button>
          ))}
        </div>
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-line"><tr><Th>Application</Th><Th>Institution</Th><Th>Type</Th>
              <Th><button className="inline-flex items-center gap-1" onClick={() => toggleSort('date')}>Submitted <ArrowDownUp className="h-3 w-3" /></button></Th>
              <Th>Status</Th><Th><button className="inline-flex items-center gap-1" onClick={() => toggleSort('priority')}>Open findings (priority) <ArrowDownUp className="h-3 w-3" /></button></Th></tr></thead>
            <tbody className="divide-y divide-line">
              {view.map(({ a, inst, st }) => (
                <tr key={a.id} tabIndex={0} className="cursor-pointer hover:bg-raised" onClick={() => nav(`/officer/review/${a.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/officer/review/${a.id}`)}>
                  <Td className="font-mono text-xs font-semibold text-brand">{a.id}</Td>
                  <Td><div className="font-medium">{inst.name}</div><div className="text-xs text-muted">{inst.city}, {inst.state}</div></Td>
                  <Td>{APP_TYPE_LABEL[a.type]}</Td><Td>{fmtDate(a.submittedAt)}</Td><Td><AppBadge s={a.status} /></Td>
                  <Td><div className="flex items-center gap-2">{st.maxSev ? <SeverityBadge s={st.maxSev} /> : <span className="text-xs text-muted">None</span>}<span className="text-xs text-muted">{st.open} open · score {st.priority}</span></div></Td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs text-muted">
            <span>{rows.length} application(s)</span>
            <span className="flex items-center gap-2"><button disabled={page === 0} onClick={() => setPage(page - 1)} className="rounded-lg border border-line px-2 py-1 disabled:opacity-40">Prev</button>Page {page + 1}/{pages}<button disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="rounded-lg border border-line px-2 py-1 disabled:opacity-40">Next</button></span>
          </div>
        </Card>
        </>
      )}
    </>
  )
}
