import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowDownUp, Search } from 'lucide-react'
import { useStore } from '../../lib/store'
import { REVIEW_STATES } from '../../lib/derive'
import { outcomeOf, type Outcome } from '../../lib/xai'
import { APP_TYPE_LABEL, fmtDate } from '../../lib/format'
import type { AppType } from '../../types'
import { Card, Empty, inputCls, PageHeader, Td, Th } from '../../components/ui'
import { OutcomeBadge } from '../../components/Explanation'

const PAGE = 10
const ORDER: Record<Outcome, number> = { REJECT: 0, ACCEPT: 1, PENDING: 2 }

export default function Queue() {
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [page, setPage] = useState(0)
  const [q, setQ] = useState('')
  const g = (k: string) => params.get(k) ?? ''
  const set = (k: string, v: string) => { const p = new URLSearchParams(params); v ? p.set(k, v) : p.delete(k); setParams(p); setPage(0) }
  const sort = g('sort') || 'outcome'
  const dir = g('dir') || 'asc'

  const rows = useMemo(() => {
    const list = s.apps.filter((a) => a.status !== 'DRAFT').map((a) => ({ a, inst: s.institutions.find((i) => i.id === a.instId)!, out: outcomeOf(s, a) }))
      .filter(({ a, inst, out }) =>
        (!q || a.id.toLowerCase().includes(q.toLowerCase()) || inst.name.toLowerCase().includes(q.toLowerCase())) &&
        (!g('type') || a.type === g('type')) && (!g('state') || inst.state === g('state')) && (!g('outcome') || out === g('outcome')) &&
        (g('group') !== 'review' || (REVIEW_STATES as readonly string[]).includes(a.status)) &&
        (g('group') !== 'processing' || a.status === 'SUBMITTED' || a.status === 'PROCESSING') &&
        (!g('status') || a.status === g('status')) && (!g('from') || (a.submittedAt ?? '') >= g('from')))
    list.sort((x, y) => {
      const v = sort === 'date' ? (x.a.submittedAt ?? '').localeCompare(y.a.submittedAt ?? '') : ORDER[x.out] - ORDER[y.out]
      return dir === 'asc' ? v : -v
    })
    return list
  }, [s, q, params, sort, dir]) // eslint-disable-line react-hooks/exhaustive-deps
  const states = [...new Set(s.institutions.map((i) => i.state))].sort()
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const view = rows.slice(page * PAGE, page * PAGE + PAGE)
  const toggleSort = (k: string) => { const p = new URLSearchParams(params); if (sort === k) p.set('dir', dir === 'asc' ? 'desc' : 'asc'); else { p.set('sort', k); p.set('dir', 'asc') } setParams(p) }
  const count = (o: Outcome) => s.apps.filter((a) => a.status !== 'DRAFT' && outcomeOf(s, a) === o).length

  return (
    <>
      <PageHeader title="Submitted applications" sub="Each submission shows the AI-suggested outcome — accept or reject. Open an institution to read the explanation and generate the report." />
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
        {(['', 'REJECT', 'ACCEPT'] as const).map((o) => (
          <button key={o} onClick={() => set('outcome', o)} className={`rounded-full px-4 py-1.5 font-semibold ${g('outcome') === o ? 'neu-pressed text-brand' : 'bg-surface text-muted neu-sm'}`}>
            {o === '' ? `All (${rows.length === s.apps.filter((a) => a.status !== 'DRAFT').length ? rows.length : '…'})` : o === 'REJECT' ? `Reject (${count('REJECT')})` : `Accept (${count('ACCEPT')})`}
          </button>
        ))}
      </div>
      <div className="mb-4 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <div className="relative col-span-2"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><input aria-label="Search by application ID or institution" value={q} onChange={(e) => { setQ(e.target.value); setPage(0) }} placeholder="Search application ID or institution" className={`${inputCls} pl-9`} /></div>
        <select aria-label="Application type" value={g('type')} onChange={(e) => set('type', e.target.value)} className={inputCls}><option value="">All types</option>{(Object.keys(APP_TYPE_LABEL) as AppType[]).map((t) => <option key={t} value={t}>{APP_TYPE_LABEL[t]}</option>)}</select>
        <select aria-label="State" value={g('state')} onChange={(e) => set('state', e.target.value)} className={inputCls}><option value="">All states</option>{states.map((x) => <option key={x}>{x}</option>)}</select>
      </div>
      {rows.length === 0 ? <Empty title="No applications match these filters" action={<button className="text-sm text-brand" onClick={() => { setParams({}); setQ('') }}>Clear filters</button>} /> : (
        <>
          <div className="space-y-3 md:hidden">
            {view.map(({ a, inst, out }) => (
              <button key={a.id} onClick={() => nav(`/officer/review/${a.id}`)} className="block w-full rounded-3xl bg-surface p-4 text-left">
                <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-brand">{a.id}</span><OutcomeBadge o={out} /></div>
                <div className="mt-1 font-semibold">{inst.name}</div>
                <div className="text-xs text-muted">{inst.city}, {inst.state} · {APP_TYPE_LABEL[a.type]} · {fmtDate(a.submittedAt)}</div>
              </button>
            ))}
          </div>
          <Card className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead className="border-b border-line"><tr><Th>Application</Th><Th>Institution</Th><Th>Type</Th>
                <Th><button className="inline-flex items-center gap-1" onClick={() => toggleSort('date')}>Submitted <ArrowDownUp className="h-3 w-3" /></button></Th>
                <Th><button className="inline-flex items-center gap-1" onClick={() => toggleSort('outcome')}>Suggested outcome <ArrowDownUp className="h-3 w-3" /></button></Th></tr></thead>
              <tbody className="divide-y divide-line">
                {view.map(({ a, inst, out }) => (
                  <tr key={a.id} tabIndex={0} className="cursor-pointer hover:bg-raised" onClick={() => nav(`/officer/review/${a.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/officer/review/${a.id}`)}>
                    <Td className="font-mono text-xs font-semibold text-brand">{a.id}</Td>
                    <Td><div className="font-medium">{inst.name}</div><div className="text-xs text-muted">{inst.city}, {inst.state}</div></Td>
                    <Td>{APP_TYPE_LABEL[a.type]}</Td><Td>{fmtDate(a.submittedAt)}</Td><Td><OutcomeBadge o={out} /></Td>
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
