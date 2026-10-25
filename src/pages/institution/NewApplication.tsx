import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check } from 'lucide-react'
import { APP_TYPES } from '../../data/catalog'
import { actions, useStore } from '../../lib/store'
import type { AppType } from '../../types'
import { Badge, Button, Card, cn, PageHeader, useToast } from '../../components/ui'

export default function NewApplication() {
  const s = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const [type, setType] = useState<AppType>('EXT')
  const create = () => {
    const r = actions.createApp(type)
    if (!r.ok) { toast('bad', r.error); return }
    toast('ok', 'Draft created. Add documents, then submit (Gate 1).')
    nav(`/institution/applications/${r.data}?tab=documents`)
  }
  return (
    <>
      <PageHeader title="New application" sub="Choose an application type. The document checklist updates for each type." />
      <div className="grid gap-3 md:grid-cols-3" role="radiogroup" aria-label="Application type">
        {APP_TYPES.map((t) => (
          <button key={t.key} role="radio" aria-checked={type === t.key} onClick={() => setType(t.key)}
            className={cn('rounded-2xl border p-4 text-left transition', type === t.key ? 'border-brand bg-brand/10' : 'border-line bg-surface hover:border-brand/50')}>
            <div className="flex items-center justify-between font-semibold">{t.name}{type === t.key && <Check className="h-4 w-4 text-brand" />}</div>
            <p className="mt-1 text-sm text-muted">{t.blurb}</p>
          </button>
        ))}
      </div>
      <Card className="mt-6 p-4">
        <h2 className="mb-3 font-semibold">Document checklist — {APP_TYPES.find((t) => t.key === type)!.name}</h2>
        <div className="overflow-x-auto"><table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-muted"><tr><th className="py-2">Document</th><th>Requirement</th><th>Formats</th><th>Handbook</th><th>Upload</th></tr></thead>
          <tbody className="divide-y divide-line">
            {s.checklists[type].map((r) => (
              <tr key={r.key}><td className="py-2 pr-3 font-medium">{r.name}</td><td><Badge tone={r.mandatory ? 'red' : 'gray'}>{r.mandatory ? 'Mandatory' : 'Optional'}</Badge></td>
                <td className="text-muted">{r.formats.join(', ')}</td><td className="text-muted">{r.clause}</td><td><Badge>Not uploaded</Badge></td></tr>
            ))}
          </tbody>
        </table></div>
        <div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-muted">You can change the type until the application is submitted.</p><Button variant="primary" onClick={create}>Create draft application</Button></div>
      </Card>
    </>
  )
}
