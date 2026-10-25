import { useState } from 'react'
import { actions, useStore } from '../../lib/store'
import { APP_TYPES } from '../../data/catalog'
import type { AppType } from '../../types'
import { Badge, Button, Card, inputCls, PageHeader, Tabs, useToast } from '../../components/ui'

export default function Checklists() {
  const s = useStore()
  const toast = useToast()
  const [type, setType] = useState<AppType>('EXT')
  const [name, setName] = useState('')
  const [clause, setClause] = useState('')
  const [mand, setMand] = useState(false)
  return (
    <>
      <PageHeader title="Application types & checklists" sub="Toggle whether each document is mandatory, or add a new requirement. Changes apply to new submissions and are audit-logged." />
      <Tabs id="chk" value={type} onChange={setType} tabs={APP_TYPES.map((t) => ({ key: t.key, label: t.name, count: s.checklists[t.key].length }))} />
      <Card className="mt-4 divide-y divide-line">
        {s.checklists[type].map((r) => (
          <div key={r.key} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
            <div><b>{r.name}</b><div className="text-xs text-muted">{r.clause} · {r.formats.join(', ')}</div></div>
            <div className="flex items-center gap-2"><Badge tone={r.mandatory ? 'red' : 'gray'}>{r.mandatory ? 'Mandatory' : 'Optional'}</Badge>
              <Button size="sm" onClick={() => { const x = actions.toggleMandatory(type, r.key); toast(x.ok ? 'ok' : 'bad', x.ok ? 'Checklist updated.' : x.error) }}>Make {r.mandatory ? 'optional' : 'mandatory'}</Button></div>
          </div>))}
      </Card>
      <Card className="mt-4 p-4"><h2 className="mb-2 font-semibold">Add requirement</h2>
        <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]"><input aria-label="Document name" className={inputCls} placeholder="Document name" value={name} onChange={(e) => setName(e.target.value)} />
          <input aria-label="Handbook clause" className={inputCls} placeholder="Handbook clause (optional)" value={clause} onChange={(e) => setClause(e.target.value)} />
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={mand} onChange={(e) => setMand(e.target.checked)} />Mandatory</label>
          <Button variant="primary" onClick={() => { const x = actions.addRequirement(type, name, clause, mand); toast(x.ok ? 'ok' : 'bad', x.ok ? 'Requirement added.' : x.error); if (x.ok) setName('') }}>Add</Button></div></Card>
    </>
  )
}
