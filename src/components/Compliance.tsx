import { useMemo, useState } from 'react'
import { Eye } from 'lucide-react'
import type { Application } from '../types'
import { useStore } from '../lib/store'
import { DEFAULT_INFRA, infraChecks, recordChecks, type InfraThresholds } from '../lib/records'
import { Callout, Card, CheckBadge, inputCls, SimTag, Td, Th } from './ui'

export function RecordsPanel({ app }: { app: Application }) {
  const s = useStore()
  const rows = useMemo(() => recordChecks(s, app), [s, app])
  return (
    <div className="space-y-3">
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line"><tr><Th>Item</Th><Th>Application</Th><Th>AICTE record</Th><Th>Status</Th><Th>Note</Th></tr></thead>
          <tbody className="divide-y divide-line">
            {rows.map((r) => (
              <tr key={r.label}><Td className="font-medium">{r.label}</Td><Td className="text-xs">{r.application}</Td><Td className="text-xs">{r.record}</Td><Td><CheckBadge s={r.status} /></Td><Td className="text-xs text-muted">{r.note}</Td></tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

export function InfraPanel({ app }: { app: Application }) {
  const s = useStore()
  const [t, setT] = useState<InfraThresholds>(DEFAULT_INFRA)
  const res = useMemo(() => infraChecks(s, app, t), [s, app, t])
  const field = (k: keyof InfraThresholds, label: string, step: number) => (
    <label className="text-xs font-semibold">{label}<input type="number" step={step} min={0} value={t[k]} onChange={(e) => setT({ ...t, [k]: Math.max(0, +e.target.value) })} className={`${inputCls} mt-1`} /></label>
  )
  return (
    <div className="space-y-3">
      <Card className="grid gap-3 p-4 sm:grid-cols-3">
        {field('sqmPerStudent', 'Classroom sq m per student', 0.1)}{field('studentsPerLab', 'Students per laboratory', 5)}{field('libraryPerStudent', 'Library sq m per student', 0.05)}
      </Card>
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-line"><tr><Th>Item</Th><Th>Declared</Th><Th>Required</Th><Th>Status</Th><Th>Evidence</Th><Th>Note</Th></tr></thead>
          <tbody className="divide-y divide-line">
            {res.rows.map((r) => (
              <tr key={r.label}><Td className="font-medium">{r.label}</Td><Td>{r.declared}</Td><Td>{r.required}</Td><Td><CheckBadge s={r.status} /></Td>
                <Td className="text-xs">{r.evidence.startsWith('SIMULATED') ? <SimTag>{r.evidence}</SimTag> : r.evidence}</Td><Td className="text-xs text-muted">{r.note}</Td></tr>
            ))}
          </tbody>
        </table>
      </Card>
      <Callout tone={res.inspect ? 'amber' : 'green'} title={res.inspect ? 'Physical inspection may be warranted' : 'No inspection indicator raised'}>
        <Eye className="mb-0.5 mr-1 inline h-4 w-4" />
        {res.inspect ? res.reasons.join(' · ') : 'The checks above do not indicate a need for inspection.'} This is advisory only — inspections are never triggered automatically.
      </Callout>
    </div>
  )
}
export type { Application }
