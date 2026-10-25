import { useState } from 'react'
import { actions, useStore } from '../../lib/store'
import { fmtDate } from '../../lib/format'
import type { Ruleset } from '../../types'
import { Badge, Button, Callout, Card, Confirm, inputCls, Modal, PageHeader, useToast, type Tone } from '../../components/ui'

const TONE: Record<Ruleset['status'], Tone> = { DRAFT: 'gray', PREVIEWED: 'blue', APPROVED: 'amber', ACTIVE: 'green', RETIRED: 'gray' }
const STEPS: Ruleset['status'][] = ['DRAFT', 'PREVIEWED', 'APPROVED', 'ACTIVE']

export default function Rulesets() {
  const s = useStore()
  const toast = useToast()
  const [create, setCreate] = useState(false)
  const [form, setForm] = useState({ name: 'Scrutiny ruleset 2026.1 (draft)', days: 90, ratio: 0.05 })
  const [act, setAct] = useState<Ruleset | null>(null)
  const run = (r: { ok: boolean } & { error?: string }, ok: string) => toast(r.ok ? 'ok' : 'bad', r.ok ? ok : r.error ?? 'Failed')
  return (
    <>
      <PageHeader title="Rulesets" sub="DRAFT → PREVIEWED → APPROVED → ACTIVE. Only an administrator can move a ruleset forward (Gate 6)." actions={<Button variant="primary" onClick={() => setCreate(true)}>New draft ruleset</Button>} />
      <Callout tone="amber">Simulated workflow: ruleset parameters change the demo’s expiry-warning impact preview. They do not alter the seeded findings.</Callout>
      <div className="mt-5 space-y-4">
        {s.rulesets.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-semibold">{r.name}</h2><p className="text-xs text-muted">{r.id} · {r.version} · created {fmtDate(r.createdAt)}{r.approvedBy && ` · approved by ${r.approvedBy}`}</p></div>
              <Badge tone={TONE[r.status]}>{r.status}</Badge>
            </div>
            <ol className="mt-3 flex flex-wrap gap-2 text-xs">{STEPS.map((st) => <li key={st} className={`rounded-full border px-2 py-0.5 ${STEPS.indexOf(r.status) >= STEPS.indexOf(st) && r.status !== 'RETIRED' ? 'border-brand/50 bg-brand/10 text-brand' : 'border-line text-muted'}`}>{st}</li>)}</ol>
            <dl className="mt-3 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div><dt className="text-xs text-muted">Expiry warning window</dt><dd>{r.expiryWarnDays} days</dd></div><div><dt className="text-xs text-muted">Min. faculty ratio</dt><dd>{r.minFacultyRatio}</dd></div><div><dt className="text-xs text-muted">Rules</dt><dd>{r.rules.length}</dd></div></dl>
            {r.impact && <div className="mt-3 rounded-xl bg-raised p-3 text-sm"><b>Preview impact</b>: {r.impact.docsFlagged} document(s) in {r.impact.appsAffected} application(s) would be flagged for expiry (active ruleset flags {r.impact.docsFlaggedActive}). Computed from stored documents’ expiry dates.</div>}
            <details className="mt-3 text-sm"><summary className="cursor-pointer text-muted">Rules ({r.rules.length})</summary><ul className="mt-2 space-y-1 text-xs">{r.rules.map((x) => <li key={x.id} className="rounded-lg bg-raised px-2 py-1"><b className="font-mono">{x.id}</b> · {x.clause} — {x.text}</li>)}</ul></details>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.status === 'DRAFT' && <Button onClick={() => run(actions.previewRuleset(r.id), 'Ruleset previewed.')}>Preview impact</Button>}
              {r.status === 'PREVIEWED' && <Button variant="success" onClick={() => run(actions.approveRuleset(r.id), 'Ruleset approved (Gate 6).')}>Approve ruleset</Button>}
              {r.status === 'APPROVED' && <Button variant="primary" onClick={() => setAct(r)}>Activate…</Button>}
            </div>
          </Card>
        ))}
      </div>
      <Modal open={create} onClose={() => setCreate(false)} title="New draft ruleset" footer={<><Button variant="ghost" onClick={() => setCreate(false)}>Cancel</Button><Button variant="primary" onClick={() => { const r = actions.createDraftRuleset(form.name, form.days, form.ratio); run(r, 'Draft created.'); if (r.ok) setCreate(false) }}>Create draft</Button></>}>
        <div className="space-y-3"><label className="block text-xs font-semibold">Name<input className={`${inputCls} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="block text-xs font-semibold">Expiry warning window (days)<input type="number" className={`${inputCls} mt-1`} value={form.days} onChange={(e) => setForm({ ...form, days: +e.target.value })} /></label>
          <label className="block text-xs font-semibold">Minimum faculty ratio<input type="number" step="0.01" className={`${inputCls} mt-1`} value={form.ratio} onChange={(e) => setForm({ ...form, ratio: +e.target.value })} /></label></div>
      </Modal>
      {act && <Confirm open onClose={() => setAct(null)} title={`Activate ${act.version}?`} confirmLabel="Activate ruleset" tone="primary" body="The current ACTIVE ruleset will be retired. Proof slips and verification runs will reference the new version. (Simulated — no production system is changed.)" onConfirm={() => { const r = actions.activateRuleset(act.id); if (!r.ok) return r.error; toast('ok', 'Ruleset activated.') }} />}
    </>
  )
}
