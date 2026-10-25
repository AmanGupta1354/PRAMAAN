import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Ban, ChevronLeft, ChevronRight, Lock, ScrollText } from 'lucide-react'
import { actions, currentUser, unresolvedHigh, useStore } from '../../lib/store'
import { buildPlan } from '../../lib/verificationPlan'
import { APP_TYPE_LABEL, fmtDate, fmtDateTime, fmtSize, ROLE_LABEL } from '../../lib/format'
import type { Finding } from '../../types'
import {
  AppBadge, Badge, Button, Callout, Card, CheckBadge, Confirm, Empty, inputCls, LinkButton, PageHeader, SimTag, Tabs, Td, Th, useToast, cn,
} from '../../components/ui'
import { DocMeta, DocPreview } from '../../components/DocPreview'
import { FindingCard } from '../../components/FindingCard'
import { VersionCompare } from '../../components/VersionCompare'
import { InfraPanel, RecordsPanel } from '../../components/Compliance'
import { downloadReport } from '../../lib/report'

type Tab = 'overview' | 'documents' | 'verification' | 'findings' | 'records' | 'faculty' | 'infrastructure' | 'versions' | 'decisions' | 'audit'
type Act = 'ACCEPT' | 'DISMISS' | 'REQUEST_EVIDENCE' | 'ESCALATE'
const ACT_COPY: Record<Act, { title: string; label: string; tone: 'success' | 'danger' | 'primary' | 'secondary'; reason: boolean; need: boolean; body: string }> = {
  ACCEPT: { title: 'Accept finding', label: 'Accept finding', tone: 'success', reason: true, need: false, body: 'Accepting confirms the issue. It becomes part of the rectification notice and stays unresolved until the institution corrects it.' },
  DISMISS: { title: 'Dismiss finding', label: 'Dismiss finding', tone: 'danger', reason: true, need: true, body: 'Dismissal requires a reason that is stored in the decision history and audit log.' },
  REQUEST_EVIDENCE: { title: 'Request additional evidence', label: 'Request evidence', tone: 'primary', reason: true, need: false, body: 'The institution will be asked for further evidence via a notice that you must approve (Gate 4).' },
  ESCALATE: { title: 'Escalate finding', label: 'Escalate', tone: 'primary', reason: true, need: false, body: 'Escalation flags this finding for the senior officer. It stays unresolved.' },
}

export default function Review() {
  const { id } = useParams()
  const s = useStore()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'overview'
  const user = currentUser(s)
  const role = user?.role
  const canDecide = role === 'scrutiny' || role === 'senior'
  const app = s.apps.find((a) => a.id === id)
  const [docSel, setDocSel] = useState('')
  const [page, setPage] = useState(1)
  const [field, setField] = useState('')
  const [dlg, setDlg] = useState<{ f: Finding; act: Act } | null>(null)
  const [recText, setRecText] = useState('Documents reviewed; no unresolved high-severity findings remain. Recommend proceeding.')
  const [noticeEdit, setNoticeEdit] = useState<Record<string, string>>({})
  const [recDlg, setRecDlg] = useState(false)
  if (!app || app.status === 'DRAFT') return <Empty title="Application not found" body="Draft applications are not visible to officers." action={<LinkButton to="/officer/queue">Back to queue</LinkButton>} />

  const inst = s.institutions.find((i) => i.id === app.instId)!
  const docs = s.docs.filter((d) => d.appId === app.id)
  const doc = docs.find((d) => d.id === docSel) ?? docs[0]
  const findings = s.findings.filter((f) => f.appId === app.id)
  const values = s.extracted.filter((e) => e.appId === app.id)
  const blockers = unresolvedHigh(s, app.id)
  const notices = s.notices.filter((n) => n.appId === app.id)
  const setTab = (t: Tab) => setParams({ tab: t })
  const docValues = values.filter((v) => v.docId === doc?.id)
  const plan = buildPlan(s, app.id)

  const run = (r: ReturnType<typeof actions.confirmValue>, ok: string) => { toast(r.ok ? 'ok' : 'bad', r.ok ? ok : r.error); return r.ok ? undefined : r.error }
  const controls = (f: Finding) => canDecide && f.status !== 'RESOLVED' ? (
    <div className="flex flex-wrap gap-2 border-t border-line pt-3">
      {(['ACCEPT', 'DISMISS', 'REQUEST_EVIDENCE', 'ESCALATE'] as Act[]).map((a) => <Button key={a} size="sm" variant={a === 'ACCEPT' ? 'success' : a === 'DISMISS' ? 'danger' : 'secondary'} onClick={() => setDlg({ f, act: a })}>{ACT_COPY[a].label}</Button>)}
    </div>
  ) : !canDecide ? <p className="flex items-center gap-1.5 border-t border-line pt-3 text-xs text-muted"><Lock className="h-3.5 w-3.5" /> Your role ({role && ROLE_LABEL[role]}) is read-only for decisions.</p> : null

  const gates = [
    ['1 · Institution submission', !!app.submittedAt, app.submittedAt ? `Submitted ${fmtDate(app.submittedAt)}` : 'Not submitted'],
    ['2 · Uncertain values confirmed', values.every((v) => v.confirmed), `${values.filter((v) => !v.confirmed).length} unconfirmed`],
    ['3 · Findings have a disposition', findings.every((f) => f.status !== 'OPEN'), `${findings.filter((f) => f.status === 'OPEN').length} open`],
    ['4 · Notice approved', notices.length === 0 || notices.every((n) => n.approved), `${notices.filter((n) => !n.approved).length} draft notice(s)`],
    ['5 · Recommendation allowed', blockers.length === 0, blockers.length ? `${blockers.length} high-severity unresolved` : app.recommendation ? 'Recorded' : 'Eligible'],
    ['6 · Ruleset approved', s.rulesets.some((r) => r.status === 'ACTIVE'), `Active: ${s.rulesets.find((r) => r.status === 'ACTIVE')?.version}`],
  ] as const

  return (
    <>
      <PageHeader title={inst.name} sub={<><span className="font-mono">{app.id}</span> · {APP_TYPE_LABEL[app.type]} · {inst.city}, {inst.state} · Submitted {fmtDate(app.submittedAt)}</>}
        actions={<><AppBadge s={app.status} /><Button onClick={() => downloadReport(s, app.id)}>Export validation report</Button><LinkButton to="/officer/queue">Work queue</LinkButton></>} />
      <Callout tone="blue">AI suggests. The authorized officer decides. Nothing on this screen approves or rejects an application automatically.</Callout>

      <div className="mt-4 grid gap-4 xl:grid-cols-[22rem_1fr]">
        {/* LEFT: documents */}
        <div className="order-last space-y-3 xl:sticky xl:top-20 xl:order-none xl:self-start">
          <Card className="p-3">
            <h2 className="mb-2 text-sm font-semibold">Documents</h2>
            <ul className="space-y-1">
              {docs.map((d) => (
                <li key={d.id}><button onClick={() => { setDocSel(d.id); setPage(1); setField('') }} className={cn('flex w-full items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-left text-sm', doc?.id === d.id ? 'neu-pressed' : 'hover:text-brand')}>
                  <span className="min-w-0"><span className="block truncate">{d.name}</span><span className="text-[11px] text-muted">v{d.version} · {fmtSize(d.size)}</span></span><CheckBadge s={d.status} /></button></li>
              ))}
            </ul>
          </Card>
          {doc && (
            <Card className="p-3">
              <DocPreview doc={doc} page={page} highlight={field || undefined} fields={docValues} />
              <div className="mt-2 flex items-center justify-between text-xs">
                <Button size="sm" variant="ghost" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                <span>Page {page} / {doc.pages ?? 1}</span>
                <Button size="sm" variant="ghost" aria-label="Next page" disabled={page >= (doc.pages ?? 1)} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
              </div>
              <div className="mt-2"><DocMeta doc={doc} /></div>
              {docValues.length > 0 && (
                <div className="mt-3"><div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted">Extracted fields <SimTag>Sample extraction</SimTag></div>
                  <ul className="space-y-1">{docValues.map((v) => (
                    <li key={v.id}><button onClick={() => { setField(v.field); setPage(v.page) }} className={cn('flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1 text-left text-xs', field === v.field ? 'bg-accent/15' : 'bg-raised')}>
                      <span><span className="text-muted">{v.field}:</span> <b>{v.value}</b> <span className="text-muted">p{v.page}</span></span>
                      <span className={v.confidence < 0.8 ? 'font-bold text-warn' : 'text-ok'}>{Math.round(v.confidence * 100)}%</span></button>
                      {!v.confirmed && <div className="mt-1 flex items-center gap-2 pl-2 text-[11px] text-warn">Needs confirmation (Gate 2)
                        <Button size="sm" variant="success" onClick={() => run(actions.confirmValue(v.id), 'Value confirmed.')} disabled={!canDecide}>Confirm</Button></div>}</li>))}</ul></div>
              )}
            </Card>
          )}
        </div>

        {/* RIGHT: tabs */}
        <div className="min-w-0">
          <Tabs id="review" value={tab} onChange={setTab} tabs={[
            { key: 'overview', label: 'Overview' }, { key: 'documents', label: 'Documents', count: docs.length }, { key: 'verification', label: 'Verification' },
            { key: 'findings', label: 'Findings', count: findings.length }, { key: 'records', label: 'AICTE records' }, { key: 'faculty', label: 'Faculty' }, { key: 'infrastructure', label: 'Infrastructure' },
            { key: 'versions', label: 'Version comparison' }, { key: 'decisions', label: 'Decisions' }, { key: 'audit', label: 'Audit history' }]} />
          <div className="mt-4 space-y-4">
            {tab === 'overview' && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4"><h2 className="mb-2 font-semibold">Case summary</h2>
                    <dl className="grid grid-cols-2 gap-2 text-sm"><dt className="text-muted">Findings</dt><dd>{findings.length} ({findings.filter((f) => f.status === 'OPEN').length} open)</dd>
                      <dt className="text-muted">High unresolved</dt><dd className={blockers.length ? 'font-bold text-bad' : ''}>{blockers.length}</dd>
                      <dt className="text-muted">Last verification</dt><dd>{fmtDateTime(app.lastRunAt)}</dd><dt className="text-muted">Session</dt><dd>{app.session}</dd></dl>
                    {app.notes.map((n) => <p key={n} className="mt-2 text-xs text-muted">{n}</p>)}</Card>
                  <Card className="p-4"><h2 className="mb-2 font-semibold">Human-in-the-loop gates</h2>
                    <ul className="space-y-1.5 text-sm">{gates.map(([n, ok, d]) => <li key={n} className="flex items-center justify-between gap-2"><span>{n}</span><span className="flex items-center gap-2 text-xs text-muted">{d}<span className={cn('h-2.5 w-2.5 rounded-full', ok ? 'bg-ok' : 'bg-warn')} /></span></li>)}</ul></Card>
                </div>
                <Card className="p-4">
                  <h2 className="mb-2 font-semibold">Senior officer recommendation (Gate 5)</h2>
                  {app.recommendation ? <Callout tone="green" title={`Recorded by ${app.recommendation.by} · ${fmtDateTime(app.recommendation.at)}`}>{app.recommendation.text}</Callout> : (
                    <>
                      {blockers.length > 0 && <Callout tone="red" title="Recommendation blocked">{blockers.length} high-severity finding(s) remain unresolved: {blockers.map((b) => `${b.id} (${b.status.toLowerCase().replace('_', ' ')})`).join(', ')}. Dismiss with a reason, or wait for the institution’s rectification to resolve them.</Callout>}
                      <textarea aria-label="Recommendation text" value={recText} onChange={(e) => setRecText(e.target.value)} rows={3} className={`${inputCls} mt-3`} disabled={role !== 'senior'} />
                      <div className="mt-2 flex items-center justify-between gap-2"><p className="text-xs text-muted">{role === 'senior' ? '' : 'Only a Senior Officer can record a recommendation. Switch account from the top-right menu.'}</p>
                        <Button variant="primary" disabled={role !== 'senior'} onClick={() => setRecDlg(true)}>Record recommendation</Button></div>
                    </>
                  )}
                </Card>
              </>
            )}

            {tab === 'documents' && (
              <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-line"><tr><Th>Document</Th><Th>File</Th><Th>Ver.</Th><Th>Pages</Th><Th>SHA-256</Th><Th>Status</Th></tr></thead>
                <tbody className="divide-y divide-line">{docs.map((d) => <tr key={d.id} className="cursor-pointer hover:bg-raised" onClick={() => setDocSel(d.id)}><Td>{d.name}</Td><Td className="text-xs">{d.fileName}</Td><Td>v{d.version}</Td><Td>{d.pages ?? '—'}</Td><Td className="font-mono text-xs">{d.fingerprint.slice(0, 14)}…</Td><Td><CheckBadge s={d.status} /></Td></tr>)}</tbody></table></Card>
            )}

            {tab === 'verification' && (
              <div className="space-y-3">
                {plan.stages.slice(0, 7).map((st, i) => (
                  <Card key={st.id} className="p-3"><h3 className="mb-2 text-sm font-semibold">Stage {i + 1} · {st.name}</h3>
                    <ul className="space-y-1.5 text-xs">{st.items.map((it) => (
                      <li key={it.id} className="flex flex-wrap items-center gap-2 rounded-lg bg-raised px-2 py-1.5"><Badge tone={it.status === 'ok' ? 'green' : it.status === 'warn' ? 'amber' : it.status === 'bad' ? 'red' : 'gray'}>{it.status === 'ok' ? 'OK' : it.status === 'warn' ? 'REVIEW' : it.status === 'bad' ? 'ISSUE' : it.status === 'na' ? 'UNAVAILABLE' : 'INFO'}</Badge>
                        <b>{it.title}</b><span className="text-muted">{it.detail}</span>{it.tag && <SimTag>{it.tag}</SimTag>}{it.right && <span className="ml-auto font-bold">{it.right}</span>}</li>))}</ul></Card>
                ))}
              </div>
            )}

            {tab === 'findings' && (
              findings.length === 0 ? <Empty title="No findings generated" body="Verification may still be running." /> : (
                <div className="space-y-3">
                  {[...findings].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'HIGH' ? -1 : b.severity === 'HIGH' ? 1 : a.severity === 'MEDIUM' ? -1 : 1)).map((f) => (
                    <FindingCard key={f.id} f={f} defaultOpen={f.status === 'OPEN'} doc={docs.find((d) => d.id === f.docId)} value={values.find((v) => v.id === f.dependsOnValue)}
                      selected={f.docId === doc?.id} onSelect={() => { if (f.docId) { setDocSel(f.docId); if (f.page) setPage(f.page) } }} controls={controls(f)} />
                  ))}
                </div>
              )
            )}

            {tab === 'records' && <RecordsPanel app={app} />}

            {tab === 'faculty' && (
              <Card className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-line"><tr><Th>Name</Th><Th>Designation</Th><Th>Qualification</Th><Th>Photo hash</Th><Th>Cross-college</Th></tr></thead>
                <tbody className="divide-y divide-line">{s.faculty.filter((f) => f.instId === app.instId).map((f) => {
                  const m = s.faculty.find((o) => o.instId !== f.instId && o.photoHash === f.photoHash && o.dobYear === f.dobYear)
                  return <tr key={f.id}><Td><b>{f.name}</b><div className="font-mono text-[11px] text-muted">{f.id}</div></Td><Td>{f.designation}</Td><Td>{f.qualification}</Td><Td className="font-mono text-xs">{f.photoHash}</Td>
                    <Td>{m ? <div><Badge tone="amber">Candidate match</Badge><div className="mt-1 text-xs text-muted">{m.id} at {s.institutions.find((i) => i.id === m.instId)?.name}. Candidate only — officer review required.</div></div> : <Badge tone="green">None</Badge>}</Td></tr>
                })}</tbody></table>
                {s.faculty.filter((f) => f.instId === app.instId).length === 0 && <div className="p-4"><Empty title="No faculty records seeded for this institution" /></div>}</Card>
            )}

            {tab === 'infrastructure' && (
              <div className="space-y-3">
                <InfraPanel app={app} />
                <h2 className="pt-2 font-semibold">Equipment invoices</h2>
                {s.invoices.filter((i) => i.instId === app.instId).length === 0 &&<Empty title="No invoices seeded for this institution" />}
                {s.invoices.filter((i) => i.instId === app.instId).map((inv) => {
                  const sum = inv.lines.reduce((n, l) => n + l.qty * l.rate, 0)
                  const dup = s.invoices.find((o) => o.instId !== inv.instId && o.invoiceNo === inv.invoiceNo)
                  return (
                    <Card key={inv.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">{inv.vendor} · <span className="font-mono text-sm">{inv.invoiceNo}</span></h3>
                      <div className="flex gap-2">{sum === inv.declaredTotal ? <Badge tone="green">Arithmetic OK</Badge> : <Badge tone="red">Total mismatch</Badge>}{dup && <Badge tone="amber">Invoice no. repeated elsewhere</Badge>}</div></div>
                      <table className="mt-2 w-full text-xs"><tbody className="divide-y divide-line">{inv.lines.map((l) => <tr key={l.item}><td className="py-1">{l.item}</td><td>{l.qty} × ₹{l.rate.toLocaleString('en-IN')}</td><td className="text-right">₹{(l.qty * l.rate).toLocaleString('en-IN')}</td></tr>)}</tbody></table>
                      <div className="mt-2 flex justify-between text-sm"><span>Computed Σ: <b>₹{sum.toLocaleString('en-IN')}</b></span><span>Declared: <b className={sum !== inv.declaredTotal ? 'text-bad' : ''}>₹{inv.declaredTotal.toLocaleString('en-IN')}</b></span></div>
                      {dup && <p className="mt-1 text-xs text-muted">Same invoice number appears for {s.institutions.find((i) => i.id === dup.instId)?.name}. Candidate only — officer review required.</p>}
                      <p className="mt-1 text-[11px] text-muted">Arithmetic is computed in your browser from seeded line items.</p></Card>)
                })}
              </div>
            )}

            {tab === 'versions' && <VersionCompare docs={docs} />}

            {tab === 'decisions' && (
              <div className="space-y-4">
                <Card className="p-4"><h2 className="mb-2 font-semibold">Rectification notices (Gate 4)</h2>
                  {notices.length === 0 && <p className="text-sm text-muted">No notice drafted. Accept a finding or request evidence, then draft a notice.</p>}
                  {notices.map((n) => (
                    <div key={n.id} className="mb-3 rounded-xl border border-line p-3">
                      <div className="mb-1 flex items-center justify-between"><b className="text-sm">{n.id}</b>{n.approved ? <Badge tone="green">Approved · ready for delivery</Badge> : <Badge tone="amber">Draft — approval required</Badge>}</div>
                      <textarea aria-label={`Notice ${n.id} text`} className={`${inputCls} font-sans`} rows={6} readOnly={n.approved || !canDecide} value={noticeEdit[n.id] ?? n.text} onChange={(e) => setNoticeEdit({ ...noticeEdit, [n.id]: e.target.value })} />
                      {n.approved ? <p className="mt-1 text-xs text-warn">Notice approved. · {n.approvedBy} · {fmtDateTime(n.approvedAt)}</p>
                        : <div className="mt-2 flex justify-end"><Button variant="primary" disabled={!canDecide} onClick={() => { const r = actions.approveNotice(n.id, noticeEdit[n.id]); toast(r.ok ? 'ok' : 'bad', r.ok ? 'Notice approved.' : r.error) }}>Approve notice</Button></div>}
                    </div>))}
                  <Button disabled={!canDecide} onClick={() => { const r = actions.draftNotice(app.id); toast(r.ok ? 'ok' : 'bad', r.ok ? 'Draft notice created from accepted findings.' : r.error); if (r.ok) setNoticeEdit({}) }}>Draft notice from accepted findings</Button>
                </Card>
                <Card className="p-4"><h2 className="mb-2 font-semibold">Decision history</h2>
                  {findings.filter((f) => f.decision).length === 0 ? <p className="text-sm text-muted">No finding decisions yet.</p> : (
                    <ul className="divide-y divide-line text-sm">{findings.filter((f) => f.decision).sort((a, b) => b.decision!.at.localeCompare(a.decision!.at)).map((f) => <li key={f.id} className="py-2"><span className="font-mono text-xs text-muted">{f.id}</span> {f.title}<div className="text-xs text-muted">{f.decision!.action.replace('_', ' ').toLowerCase()} · {f.decision!.by} · {fmtDateTime(f.decision!.at)}{f.decision!.reason && <> · “{f.decision!.reason}”</>}</div></li>)}</ul>)}
                </Card>
              </div>
            )}

            {tab === 'audit' && (
              <Card className="p-4">{s.audit.filter((a) => a.target === app.id).length === 0 ? <Empty icon={<ScrollText className="h-8 w-8" />} title="No audit entries" /> : (
                <ul className="divide-y divide-line text-sm">{[...s.audit.filter((a) => a.target === app.id)].reverse().map((a) => <li key={a.id} className="py-2"><span className="font-mono text-xs text-brand">#{a.id}</span> <b>{a.action}</b> · {a.actor}<div className="text-xs text-muted">{fmtDateTime(a.at)} · {a.detail}</div></li>)}</ul>)}</Card>
            )}
          </div>
        </div>
      </div>

      {dlg && (
        <Confirm open onClose={() => setDlg(null)} title={`${ACT_COPY[dlg.act].title} · ${dlg.f.id}`} confirmLabel={ACT_COPY[dlg.act].label} tone={ACT_COPY[dlg.act].tone}
          body={<><b className="text-fg">{dlg.f.title}</b><br />{ACT_COPY[dlg.act].body}</>} reasonLabel={dlg.act === 'DISMISS' ? 'Reason for dismissal' : 'Note (optional)'} reasonRequired={ACT_COPY[dlg.act].need}
          onConfirm={(reason) => { const r = actions.decideFinding(dlg.f.id, dlg.act, reason); if (!r.ok) return r.error; toast('ok', `${dlg.f.id}: decision recorded.`) }} />
      )}
      <Confirm open={recDlg} onClose={() => setRecDlg(false)} title="Record senior officer recommendation?" confirmLabel="Record recommendation" tone="primary"
        body="This records a recommendation in the case file and audit log. It is not an approval by AICTE." onConfirm={() => { const r = actions.recordRecommendation(app.id, recText); if (!r.ok) return r.error; toast('ok', 'Recommendation recorded (Gate 5).') }} />
      {role === 'auditor' && <div className="mt-4 flex items-center gap-2 text-xs text-muted"><Ban className="h-3.5 w-3.5" /> Auditor view is read-only.</div>}
    </>
  )
}
