import { useState } from 'react'
import { actions, useStore } from '../../lib/store'
import { Button, Callout, Card, Confirm, PageHeader, useToast } from '../../components/ui'

export default function DemoData() {
  const s = useStore()
  const toast = useToast()
  const [open, setOpen] = useState(false)
  return (
    <>
      <PageHeader title="Demo data" sub="All state in this prototype lives in your browser’s localStorage." />
      <Card className="p-4 text-sm">
        <ul className="grid gap-1 text-muted sm:grid-cols-2"><li>{s.institutions.length} institutions</li><li>{s.apps.length} applications</li><li>{s.docs.length} documents</li><li>{s.findings.length} findings</li><li>{s.proofs.length} proof slips</li><li>{s.audit.length} audit entries</li></ul>
        <div className="mt-4"><Callout tone="amber" title="Reset demo data">Restores the seeded dataset and discards every change made in this browser (applications, decisions, rulesets, proof slips, audit log). You stay signed in.</Callout></div>
        <div className="mt-4"><Button variant="danger" onClick={() => setOpen(true)}>Reset demo data…</Button></div>
      </Card>
      <Confirm open={open} onClose={() => setOpen(false)} title="Reset all demo data?" confirmLabel="Reset" tone="danger" body="This cannot be undone." onConfirm={() => { const r = actions.resetDemo(); if (!r.ok) return r.error; toast('ok', 'Demo data reset to the seeded state.') }} />
    </>
  )
}
