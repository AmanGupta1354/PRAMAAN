import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Activity, QrCode, Send, ShieldAlert, ShieldCheck } from 'lucide-react'
import { actions, currentUser, useStore } from '../../lib/store'
import { APP_TYPE_LABEL, fmtDate, fmtDateTime } from '../../lib/format'
import { APP_TYPES } from '../../data/catalog'
import type { AppType } from '../../types'
import { AppBadge, Button, Callout, Card, CheckBadge, Confirm, Empty, inputCls, LinkButton, PageHeader, Tabs, useToast } from '../../components/ui'
import { UploadWorkspace } from '../../components/UploadWorkspace'
import { FindingCard } from '../../components/FindingCard'
import { VersionCompare } from '../../components/VersionCompare'
import { ExplanationPanel } from '../../components/Explanation'
import { PhotoEnhance } from '../../components/PhotoEnhance'
import { downloadReport } from '../../lib/report'

type Tab = 'overview' | 'explanation' | 'documents' | 'findings' | 'rectification' | 'timeline'

export default function AppDetail() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'overview'
  const [submitOpen, setSubmitOpen] = useState(false)
  const [note, setNote] = useState('')
  const user = currentUser(s)
  const app = s.apps.find((a) => a.id === id && a.instId === user?.instId)
  if (!app) return <Empty title="Application not found" body="It does not exist, or it belongs to another institution. Institutions can only see their own records." action={<LinkButton to="/institution/applications">Back to applications</LinkButton>} />

  const inst = s.institutions.find((i) => i.id === app.instId)!
  const docs = s.docs.filter((d) => d.appId === app.id)
  const findings = s.findings.filter((f) => f.appId === app.id)
  const values = s.extracted.filter((e) => e.appId === app.id)
  const notices = s.notices.filter((n) => n.appId === app.id && n.approved)
  const reqs = s.checklists[app.type]
  const missing = reqs.filter((r) => r.mandatory && !docs.some((d) => d.reqKey === r.key))
  const needsFix = findings.filter((f) => f.status === 'ACCEPTED' || f.status === 'NEEDS_EVIDENCE')
  const proofs = s.proofs.filter((p) => p.appId === app.id)
  const setTab = (t: Tab) => setParams({ tab: t })
  const rectifying = app.status === 'RECTIFICATION_REQUESTED'
  const canVerify = ['SUBMITTED', 'PROCESSING', 'RESUBMITTED'].includes(app.status)

  const changeType = (t: AppType) => { const r = actions.setAppType(app.id, t); toast(r.ok ? 'info' : 'bad', r.ok ? `Type changed to ${APP_TYPE_LABEL[t]}.` : r.error) }
  const submit = () => {
    const r = actions.submitApp(app.id)
    if (!r.ok) return r.error
    toast('ok', 'Application submitted (Gate 1). Start the verification demo.')
    nav(`/institution/applications/${app.id}/verify`)
  }
  const resubmit = () => {
    const r = actions.resubmit(app.id, note)
    if (!r.ok) { toast('bad', r.error); return }
    toast('ok', 'Resubmitted. Re-running checks for replaced documents.')
    nav(`/institution/applications/${app.id}/verify`)
  }
  const makeProof = () => {
    const r = actions.generateProof(app.id)
    if (!r.ok) { toast('bad', r.error); return }
    toast('ok', 'Proof slip generated.')
    nav('/institution/proofs')
  }

  return (
    <>
      <PageHeader title={`${APP_TYPE_LABEL[app.type]}`}
        sub={<><span className="font-mono">{app.id}</span> · {inst.name} · Session {app.session} · Created {fmtDate(app.createdAt)}</>}
        actions={<>
          <AppBadge s={app.status} />
          {app.status === 'DRAFT' && <Button variant="primary" onClick={() => setSubmitOpen(true)}><Send className="h-4 w-4" /> Submit application</Button>}
          {canVerify && <LinkButton to={`/institution/applications/${app.id}/verify`} variant="primary"><Activity className="h-4 w-4" /> {app.status === 'PROCESSING' ? 'Open verification' : 'Start verification'}</LinkButton>}
          {app.verifiedOnce && !canVerify && <LinkButton to={`/institution/applications/${app.id}/verify`}><Activity className="h-4 w-4" /> View verification replay</LinkButton>}
          {app.verifiedOnce && <Button onClick={() => downloadReport(s, app.id)}>Validation report</Button>}
          {app.verifiedOnce && <Button onClick={makeProof}><QrCode className="h-4 w-4" /> Generate proof slip</Button>}
        </>} />

      <Tabs id="appdetail" value={tab} onChange={setTab} tabs={[
        { key: 'overview', label: 'Overview' }, { key: 'explanation', label: 'Decision explained' }, { key: 'documents', label: 'Documents', count: docs.length },
        { key: 'findings', label: 'Findings', count: findings.length }, { key: 'rectification', label: 'Rectification', count: needsFix.length || undefined },
        { key: 'timeline', label: 'Timeline' }]} />

      <div className="mt-5">
        {tab === 'overview' && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-4 lg:col-span-2">
              <h2 className="mb-3 font-semibold">Application details</h2>
              <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-xs text-muted">Application ID</dt><dd className="font-mono">{app.id}</dd></div>
                <div><dt className="text-xs text-muted">Institution</dt><dd>{inst.name}</dd></div>
                <div><dt className="text-xs text-muted">Institution ID</dt><dd className="font-mono">{inst.id}</dd></div>
                <div><dt className="text-xs text-muted">Type</dt><dd>{APP_TYPE_LABEL[app.type]}</dd></div>
                <div><dt className="text-xs text-muted">Academic session</dt><dd>{app.session}</dd></div>
                <div><dt className="text-xs text-muted">Submitted</dt><dd>{fmtDate(app.submittedAt)}</dd></div>
              </dl>
              {app.status === 'DRAFT' && (
                <div className="mt-4"><label className="text-xs font-semibold text-muted">Change application type (draft only)</label>
                  <select value={app.type} onChange={(e) => changeType(e.target.value as AppType)} className={`${inputCls} mt-1 max-w-xs`}>{APP_TYPES.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}</select></div>
              )}
              <h3 className="mb-2 mt-5 text-sm font-semibold">Document checklist</h3>
              <ul className="space-y-1.5 text-sm">
                {reqs.map((r) => { const d = docs.find((x) => x.reqKey === r.key); return (
                  <li key={r.key} className="flex items-center justify-between gap-2 rounded-xl bg-raised px-3 py-1.5"><span>{r.name}{r.mandatory && <span className="text-bad"> *</span>}</span>{d ? <CheckBadge s={d.status} /> : <span className="text-xs text-muted">Missing</span>}</li>) })}
              </ul>
              {app.notes.length > 0 && <div className="mt-4 text-sm"><div className="font-semibold">Notes</div>{app.notes.map((n) => <p key={n} className="text-muted">{n}</p>)}</div>}
            </Card>
            <div className="space-y-4">
              <Card className="p-4">
                <h2 className="mb-2 font-semibold">Verification status</h2>
                {!app.verifiedOnce ? <p className="text-sm text-muted">{app.status === 'DRAFT' ? 'Submit the application to start verification.' : 'Verification has not completed yet.'}</p> : (
                  <p className="text-sm text-muted">Last run {fmtDateTime(app.lastRunAt)} · {findings.length} finding(s) · {findings.filter((f) => f.status === 'OPEN').length} awaiting officer decision.</p>)}
                {app.recommendation && <Callout tone="green" title="Officer recommendation recorded">{app.recommendation.text}</Callout>}
              </Card>
              {missing.length > 0 && app.status === 'DRAFT' && <Callout tone="amber" title={`${missing.length} mandatory document(s) missing`}>Upload them before submitting.</Callout>}
              {proofs.length > 0 && <Card className="p-4 text-sm"><h2 className="mb-2 font-semibold">Proof slips</h2>{proofs.map((p) => <Link key={p.id} to={`/verify/${p.id}`} className="block font-mono text-xs text-brand">{p.id}</Link>)}</Card>}
              <Callout tone="blue">PRAMAAN assists verification. Final decisions remain with authorized officers.</Callout>
            </div>
          </div>
        )}

        {tab === 'explanation' && (app.verifiedOnce ? <ExplanationPanel app={app} /> : <Empty title="No explanation yet" body="The explanation appears once verification has completed." />)}

        {tab === 'documents' && <div className="space-y-6"><UploadWorkspace app={app} editable={app.status === 'DRAFT'} /><div><h2 className="mb-2 font-semibold">Lab and classroom photo enhancement</h2><PhotoEnhance /></div></div>}

        {tab === 'findings' && (
          findings.length === 0 ? <Empty icon={<ShieldCheck className="h-8 w-8" />} title="No findings yet" body="Findings appear after the verification pipeline completes." /> : (
            <div className="space-y-3">
              {values.filter((v) => !v.confirmed).map((v) => (
                <Callout key={v.id} tone="amber" title={`Confirm extracted value: ${v.field}`}>
                  Read as <b>{v.value}</b> on page {v.page} with {Math.round(v.confidence * 100)}% confidence (sample extraction). Low-confidence values cannot be used in compliance rules until a human confirms them.
                  <div className="mt-2"><Button size="sm" variant="success" onClick={() => { const r = actions.confirmValue(v.id); toast(r.ok ? 'ok' : 'bad', r.ok ? 'Value confirmed (Gate 2).' : r.error) }}>Confirm value</Button></div>
                </Callout>
              ))}
              {findings.map((f) => <FindingCard key={f.id} f={f} doc={docs.find((d) => d.id === f.docId)} value={values.find((v) => v.id === f.dependsOnValue)} />)}
            </div>
          )
        )}

        {tab === 'rectification' && (
          <div className="space-y-4">
            {notices.length === 0 && !rectifying && <Empty icon={<ShieldAlert className="h-8 w-8" />} title="No rectification requested" body="When an officer approves a notice (Gate 4), the required corrections appear here." />}
            {notices.map((n) => (
              <Card key={n.id} className="p-4"><div className="mb-1 flex items-center justify-between"><h2 className="font-semibold">Officer-approved notice {n.id}</h2><span className="text-xs text-muted">Approved by {n.approvedBy} · {fmtDateTime(n.approvedAt)}</span></div>
                <pre className="whitespace-pre-wrap rounded-xl bg-raised p-3 font-sans text-sm">{n.text}</pre>
                <p className="mt-2 text-xs text-warn">Notice approved.</p></Card>
            ))}
            {rectifying && (
              <>
                <h2 className="font-semibold">Replace documents</h2>
                <UploadWorkspace app={app} editable />
                <Card className="p-4">
                  <label className="text-sm font-semibold" htmlFor="note">Note to scrutiny officer (optional)</label>
                  <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={3} className={`${inputCls} mt-1`} placeholder="Describe what you corrected" />
                  <div className="mt-3 flex items-center justify-between gap-2"><p className="text-xs text-muted">Resubmitting re-runs checks for replaced documents only.</p><Button variant="primary" onClick={resubmit}><Send className="h-4 w-4" /> Resubmit application</Button></div>
                </Card>
              </>
            )}
            <h2 className="font-semibold">Version comparison</h2>
            <VersionCompare docs={docs} />
          </div>
        )}

        {tab === 'timeline' && (
          <Card className="p-4"><ol className="relative space-y-4 border-l border-line pl-5">
            {[...app.timeline].reverse().map((t, i) => (
              <li key={i} className="relative"><span className="absolute -left-[26px] top-1 h-2.5 w-2.5 rounded-full bg-brand" /><div className="text-sm font-medium">{t.label}</div><div className="text-xs text-muted">{fmtDateTime(t.at)} · {t.actor}</div></li>
            ))}
          </ol></Card>
        )}
      </div>

      <Confirm open={submitOpen} onClose={() => setSubmitOpen(false)} title="Submit application? (Gate 1)" confirmLabel="Submit" tone="primary"
        body={<>Submission is an explicit institution action. After submitting, documents are locked except through rectification. {missing.length > 0 && <b className="text-bad">{missing.length} mandatory document(s) are missing and submission will be blocked.</b>}</>}
        onConfirm={submit} />
    </>
  )
}
