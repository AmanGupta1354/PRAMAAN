import { useState } from 'react'
import { ShieldCheck, ShieldX } from 'lucide-react'
import { actions, useStore } from '../../lib/store'
import { fmtDateTime } from '../../lib/format'
import { Badge, Button, Callout, Card, inputCls, PageHeader, Td, Th } from '../../components/ui'

export default function AuditLog() {
  const s = useStore()
  const [q, setQ] = useState('')
  const [res, setRes] = useState<{ ok: boolean; brokenAt?: number } | null>(null)
  const rows = [...s.audit].reverse().filter((a) => !q || `${a.action} ${a.target} ${a.actor} ${a.detail}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <>
      <PageHeader title="Audit log" sub="Append-only, hash-chained activity history for this demo browser." actions={<Button onClick={() => setRes(actions.verifyAudit())}><ShieldCheck className="h-4 w-4" /> Verify hash chain</Button>} />
      <Callout tone="blue" title="Tamper evidence, not tamper-proofing">Each entry stores the SHA-256 of its content and the previous entry’s hash, so edits to stored entries are detectable. A privileged person who can rewrite the whole chain (or clear localStorage) is not stopped by this.</Callout>
      {res && <div className="mt-3"><Callout tone={res.ok ? 'green' : 'red'} title={res.ok ? `Chain intact · ${s.audit.length} entries verified` : `Chain broken at entry #${res.brokenAt}`}>{res.ok ? 'Every entry’s hash and link to its predecessor recomputed correctly.' : 'An entry or its link has been altered.'}</Callout></div>}
      <input aria-label="Filter audit log" className={`${inputCls} mt-4 max-w-sm`} placeholder="Filter by action, target, actor…" value={q} onChange={(e) => setQ(e.target.value)} />
      <Card className="mt-3 overflow-x-auto">
        <table className="w-full text-sm"><thead className="border-b border-line"><tr><Th>#</Th><Th>Time</Th><Th>Actor</Th><Th>Action</Th><Th>Target</Th><Th>Detail</Th><Th>Hash</Th></tr></thead>
          <tbody className="divide-y divide-line">{rows.slice(0, 200).map((a) => (
            <tr key={a.id}><Td className="font-mono text-xs">{a.id}</Td><Td className="whitespace-nowrap text-xs">{fmtDateTime(a.at)}</Td><Td>{a.actor}<div className="text-[11px] text-muted">{a.role}</div></Td>
              <Td><Badge tone="blue">{a.action}</Badge></Td><Td className="font-mono text-xs">{a.target}</Td><Td className="max-w-xs text-xs text-muted">{a.detail}</Td><Td className="font-mono text-[11px] text-muted" title={a.hash}>{a.hash.slice(0, 10)}…</Td></tr>))}</tbody></table>
        {rows.length === 0 && <p className="p-4 text-sm text-muted">No entries match.</p>}
      </Card>
      <ShieldX className="hidden" />
    </>
  )
}
