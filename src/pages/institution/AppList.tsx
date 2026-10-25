import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { FilePlus2, Search } from 'lucide-react'
import { STATUS_GROUPS, useMyApps } from '../../lib/hooks'
import { useStore } from '../../lib/store'
import { APP_TYPE_LABEL, fmtDate } from '../../lib/format'
import { AppBadge, Card, Empty, inputCls, LinkButton, PageHeader, Td, Th } from '../../components/ui'

export default function AppList() {
  const apps = useMyApps()
  const s = useStore()
  const nav = useNavigate()
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState('')
  const group = params.get('status') ?? ''
  const rows = useMemo(() => apps
    .filter((a) => !group || STATUS_GROUPS[group]?.set.includes(a.status))
    .filter((a) => !q || a.id.toLowerCase().includes(q.toLowerCase()) || APP_TYPE_LABEL[a.type].toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [apps, group, q])
  return (
    <>
      <PageHeader title="Applications" sub="All applications for your institution." actions={<LinkButton to="/institution/applications/new" variant="primary"><FilePlus2 className="h-4 w-4" /> New application</LinkButton>} />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative min-w-52 flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><input aria-label="Search applications" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ID or type" className={`${inputCls} pl-9`} /></div>
        <select aria-label="Filter by stage" value={group} onChange={(e) => setParams(e.target.value ? { status: e.target.value } : {})} className={`${inputCls} w-auto`}>
          <option value="">All stages</option>
          {Object.entries(STATUS_GROUPS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
        </select>
      </div>
      {rows.length === 0 ? <Empty title="No applications match" body="Adjust the filters or create a new application." action={<LinkButton to="/institution/applications/new" variant="primary">New application</LinkButton>} /> : (
        <>
        <div className="space-y-3 md:hidden">
          {rows.map((a) => (
            <Link key={a.id} to={`/institution/applications/${a.id}`} className="block rounded-3xl bg-surface p-4">
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-semibold text-brand">{a.id}</span><AppBadge s={a.status} /></div>
              <div className="mt-1 font-semibold">{APP_TYPE_LABEL[a.type]}</div>
              <div className="text-xs text-muted">Created {fmtDate(a.createdAt)} · {s.docs.filter((d) => d.appId === a.id).length} document(s)</div>
            </Link>
          ))}
        </div>
        <Card className="hidden overflow-x-auto md:block">
          <table className="w-full text-sm">
            <thead className="border-b border-line"><tr><Th>Application</Th><Th>Type</Th><Th>Created</Th><Th>Documents</Th><Th>Status</Th></tr></thead>
            <tbody className="divide-y divide-line">
              {rows.map((a) => (
                <tr key={a.id} tabIndex={0} onClick={() => nav(`/institution/applications/${a.id}`)} onKeyDown={(e) => e.key === 'Enter' && nav(`/institution/applications/${a.id}`)} className="cursor-pointer hover:bg-raised">
                  <Td><Link to={`/institution/applications/${a.id}`} className="font-mono text-xs font-semibold text-brand" onClick={(e) => e.stopPropagation()}>{a.id}</Link></Td>
                  <Td>{APP_TYPE_LABEL[a.type]}</Td><Td>{fmtDate(a.createdAt)}</Td>
                  <Td>{s.docs.filter((d) => d.appId === a.id).length}</Td><Td><AppBadge s={a.status} /></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        </>
      )}
    </>
  )
}
