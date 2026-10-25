import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, ArrowRight, Check, CircleSlash, FastForward, Info, Pause, Play, RotateCcw, ShieldAlert, X } from 'lucide-react'
import { actions, currentUser, useStore } from '../../lib/store'
import { buildPlan, type ItemStatus, type PlanItem } from '../../lib/verificationPlan'
import { APP_TYPE_LABEL } from '../../lib/format'
import { Badge, Button, Card, cn, Empty, LinkButton, PageHeader, Progress, SimTag, StrengthBadge, useToast } from '../../components/ui'
import { DocPreview } from '../../components/DocPreview'

const ICON: Record<ItemStatus, typeof Check> = { ok: Check, warn: AlertTriangle, bad: X, info: Info, na: CircleSlash }
const TONE: Record<ItemStatus, string> = { ok: 'text-ok bg-ok/15', warn: 'text-warn bg-warn/15', bad: 'text-bad bg-bad/15', info: 'text-info bg-info/15', na: 'text-muted bg-muted/15' }

type Feed = { at: number; text: string; status: ItemStatus }

export default function VerifyPipeline() {
  const { id } = useParams()
  const s = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const user = currentUser(s)
  const app = s.apps.find((a) => a.id === id && a.instId === user?.instId)
  const plan = useMemo(() => (app ? buildPlan(s, app.id) : null), [app?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const [started, setStarted] = useState(false)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [fast, setFast] = useState(false)
  const [stage, setStage] = useState(0)
  const [revealed, setRevealed] = useState<number[]>(() => Array(8).fill(0))
  const [view, setView] = useState<number | null>(null)
  const [feed, setFeed] = useState<Feed[]>([])
  const [elapsed, setElapsed] = useState(0)
  const t0 = useRef(0)

  const total = plan ? plan.stages.reduce((n, st) => n + st.items.length, 0) : 1
  const done = revealed.reduce((a, b) => a + b, 0)
  const pct = finished ? 100 : Math.round((done / total) * 100)
  const live = app?.status === 'SUBMITTED' || app?.status === 'RESUBMITTED' || app?.status === 'PROCESSING'

  const log = useCallback((text: string, status: ItemStatus) => setFeed((f) => [{ at: Date.now(), text, status }, ...f].slice(0, 60)), [])

  const begin = () => {
    if (!app) return
    if (app.status === 'SUBMITTED' || app.status === 'RESUBMITTED') {
      const r = actions.beginVerification(app.id)
      if (!r.ok) { toast('bad', r.error); return }
    }
    setStarted(true); setRunning(true); setFinished(false); setStage(0); setView(null)
    setRevealed(Array(8).fill(0)); setFeed([]); t0.current = Date.now(); setElapsed(0)
    log('Verification job started', 'info')
  }
  const restart = () => { setStarted(false); setRunning(false); setFinished(false); setStage(0); setRevealed(Array(8).fill(0)); setFeed([]); setView(null) }

  // controlled timer: each tick reveals one check; state transitions are real, outcomes simulated
  useEffect(() => {
    if (!running || !plan) return
    const timer = setInterval(() => {
      const st = plan.stages[stage]
      const n = revealed[stage]
      if (n < st.items.length) {
        const it = st.items[n]
        setRevealed((r) => r.map((v, i) => (i === stage ? v + 1 : v)))
        log(`${st.name}: ${it.title}${it.status === 'warn' ? ' — needs review' : it.status === 'bad' ? ' — discrepancy' : it.status === 'na' ? ' — unavailable' : ''}`, it.status)
      } else if (stage < plan.stages.length - 1) {
        log(`Stage ${stage + 1} complete — ${st.name}`, 'ok')
        setStage(stage + 1)
      } else {
        setRunning(false); setFinished(true)
        if (app?.status === 'PROCESSING') {
          const r = actions.completeVerification(app.id)
          if (r.ok) log(`State updated: ${r.data.findings || 'existing'} finding(s) recorded — awaiting officer review`, 'warn')
        }
        log('Verification demo completed. Officer review required.', 'info')
      }
    }, fast ? 35 : 520)
    return () => clearInterval(timer)
  }, [running, stage, revealed, plan, fast, log, app])

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setElapsed((Date.now() - t0.current) / 1000), 200)
    return () => clearInterval(t)
  }, [running])

  if (!app || !plan) return <Empty title="Application not found" action={<LinkButton to="/institution/applications">Back</LinkButton>} />
  const docs = s.docs.filter((d) => d.appId === app.id)
  const shown = view ?? stage
  const cur = plan.stages[shown]
  const curRevealed = revealed[shown]
  const previewDoc = (shown === 0 ? docs[Math.min(Math.max(curRevealed - 1, 0), docs.length - 1)] : docs.find((d) => d.reqKey === 'FIRE') ?? docs[0])
  const warnCount = plan.stages.slice(0, 7).flatMap((st) => st.items).filter((i, idx) => idx < 999 && i.status === 'warn').length
  const jobState = !started ? 'PENDING' : running ? 'PROCESSING' : finished ? (warnCount || plan.flags.length ? 'COMPLETED_WITH_WARNINGS' : 'COMPLETED') : 'PROCESSING (paused)'
  const stageState = (i: number): 'pending' | 'active' | 'done' => (started && (finished || i < stage) ? 'done' : started && i === stage ? 'active' : 'pending')
  const stageTone = (i: number) => {
    const its = plan.stages[i].items.slice(0, revealed[i])
    return its.some((x) => x.status === 'bad') ? 'bad' : its.some((x) => x.status === 'warn') ? 'warn' : 'ok'
  }
  const highlight = shown === 2 && cur.items[Math.min(curRevealed, cur.items.length - 1)]?.title

  return (
    <>
      <PageHeader title="Verification progress" sub={<><span className="font-mono">{app.id}</span> · {APP_TYPE_LABEL[app.type]} · {docs.length} document(s)</>}
        actions={<LinkButton to={`/institution/applications/${app.id}`}>Back to application</LinkButton>} />


      <Card className="mb-4 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-4xl font-extrabold tabular-nums" aria-live="polite">{pct}<span className="text-lg text-muted">%</span></div>
            <div><Badge tone={finished ? 'amber' : started ? 'cyan' : 'gray'}>{jobState.replace(/_/g, ' ')}</Badge>
              <div className="mt-1 text-xs text-muted">Stage {Math.min(stage + 1, 8)}/8 · {total} checks · {elapsed.toFixed(1)}s <SimTag>simulated duration</SimTag></div></div>
          </div>
          <div className="flex flex-wrap gap-2">
            {!started && live && <Button variant="primary" onClick={begin}><Play className="h-4 w-4" /> Start verification</Button>}
            {!started && !live && <Button variant="primary" onClick={begin}><Play className="h-4 w-4" /> Replay previous results</Button>}
            {started && !finished && <Button onClick={() => setRunning((r) => !r)}>{running ? <><Pause className="h-4 w-4" /> Pause</> : <><Play className="h-4 w-4" /> Resume</>}</Button>}
            {started && !finished && <Button onClick={() => setFast(true)} disabled={fast}><FastForward className="h-4 w-4" /> Skip animation</Button>}
            {started && <Button variant="ghost" onClick={restart}><RotateCcw className="h-4 w-4" /> Restart</Button>}
          </div>
        </div>
        <Progress value={pct} className="mt-3 h-2.5" tone={finished ? 'amber' : 'cyan'} />
      </Card>

      <div className="grid gap-4 xl:grid-cols-[16rem_1fr_20rem]">
        <Card className="p-3">
          <ol className="space-y-1">
            {plan.stages.map((st, i) => {
              const state = stageState(i); const tone = stageTone(i)
              return (
                <li key={st.id}>
                  <button onClick={() => setView(i === stage && !finished ? null : i)} disabled={!started || (i > stage && !finished)}
                    className={cn('flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition disabled:opacity-50', shown === i && started ? 'neu-pressed' : 'hover:text-brand')}>
                    <span className={cn('relative grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold',
                      state === 'done' ? (tone === 'bad' ? 'bg-bad/20 text-bad' : tone === 'warn' ? 'bg-warn/20 text-warn' : 'bg-ok/20 text-ok') : state === 'active' ? 'bg-accent/20 text-accent' : 'bg-raised text-muted')}>
                      {state === 'active' && <motion.span className="absolute inset-0 rounded-full border border-accent" animate={{ scale: [1, 1.5], opacity: [0.8, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} />}
                      {state === 'done' ? (tone === 'bad' ? <X className="h-3.5 w-3.5" /> : tone === 'warn' ? <AlertTriangle className="h-3.5 w-3.5" /> : <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}><Check className="h-3.5 w-3.5" /></motion.span>) : i + 1}
                    </span>
                    <span className="min-w-0 flex-1 leading-tight"><span className="block truncate">{st.name}</span>
                      <span className="text-[11px] text-muted">{revealed[i]}/{st.items.length} checks</span></span>
                  </button>
                </li>
              )
            })}
          </ol>
        </Card>

        <div className="min-w-0 space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div><h2 className="font-semibold">Stage {shown + 1} · {cur.name}</h2><p className="text-xs text-muted">{cur.blurb}</p></div>
              <Progress value={cur.items.length ? (curRevealed / cur.items.length) * 100 : 0} className="w-32" tone="cyan" />
            </div>
            {!started ? (
              <Empty icon={<ShieldAlert className="h-8 w-8" />} title="Verification has not started" body={live ? 'Press “Start verification”. Each check below will execute and report its result.' : 'This application has already been verified. Replay the stages to review how results were produced.'} />
            ) : (
              <div className="grid gap-4 md:grid-cols-[11rem_1fr]">
                <div className="hidden md:block">
                  {previewDoc && <DocPreview doc={previewDoc} scan={running && (shown === 1 || shown === 4)} highlight={highlight || undefined} page={1} />}
                  <p className="mt-1 truncate text-center text-[11px] text-muted">{previewDoc?.fileName}</p>
                </div>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {cur.items.slice(0, curRevealed).map((it) => <ItemRow key={it.id} it={it} />)}
                  </AnimatePresence>
                  {running && shown === stage && curRevealed < cur.items.length && (
                    <li className="flex items-center gap-2 rounded-xl border border-dashed border-accent/50 px-3 py-2 text-sm text-accent">
                      <motion.span className="h-2 w-2 rounded-full bg-accent" animate={{ opacity: [1, 0.2, 1] }} transition={{ repeat: Infinity, duration: 0.9 }} /> Running {cur.items[curRevealed].title}…
                    </li>
                  )}
                </ul>
              </div>
            )}
          </Card>

          {finished && (
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="border-warn/40 p-5">
                <h2 className="text-lg font-bold">Verification demo completed. Officer review required.</h2>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
                  {plan.stages[7].items.slice(0, 5).map((it) => (
                    <div key={it.id} className="rounded-xl bg-raised p-3"><div className="text-[11px] uppercase tracking-wide text-muted">{it.title}</div><div className={cn('text-2xl font-bold tabular-nums', it.status === 'bad' && 'text-bad', it.status === 'warn' && 'text-warn', it.status === 'ok' && 'text-ok')}>{it.right}</div></div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted">{plan.flags.length} finding(s) were generated for officer review. Nothing has been approved or rejected. The AI suggests; the authorized officer decides.</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => nav(`/institution/applications/${app.id}?tab=findings`)}>View findings <ArrowRight className="h-4 w-4" /></Button>
                  <Link to={`/institution/applications/${app.id}`}><Button>Back to application</Button></Link>
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        <Card className="flex max-h-[34rem] flex-col p-3">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">Activity feed {running && <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />}</h2>
          <ul className="flex-1 space-y-1.5 overflow-y-auto text-xs" aria-live="polite">
            {feed.length === 0 && <li className="text-muted">Events appear here as checks execute.</li>}
            {feed.map((f, i) => {
              const I = ICON[f.status]
              return <motion.li key={f.at + i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2 rounded-lg bg-raised px-2 py-1.5"><span className={cn('mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full', TONE[f.status])}><I className="h-2.5 w-2.5" /></span><span>{f.text}</span></motion.li>
            })}
          </ul>
        </Card>
      </div>
    </>
  )
}

function ItemRow({ it }: { it: PlanItem }) {
  const I = ICON[it.status]
  return (
    <motion.li layout initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
      className={cn('flex items-start gap-3 rounded-xl border bg-bg/40 p-3', it.status === 'warn' ? 'border-warn/40' : it.status === 'bad' ? 'border-bad/50' : 'border-line')}>
      <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 18 }} className={cn('mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full', TONE[it.status])}><I className="h-3.5 w-3.5" /></motion.span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">{it.title}{it.tag && <SimTag>{it.tag}</SimTag>}{it.strength && <StrengthBadge s={it.strength} simulated />}{it.confirm && <Badge tone="amber">Needs human confirmation (Gate 2)</Badge>}</div>
        <p className="mt-0.5 break-words text-xs text-muted">{it.detail}</p>
      </div>
      {it.right && <div className={cn('text-sm font-bold tabular-nums', it.status === 'warn' && 'text-warn')}>{it.right}</div>}
    </motion.li>
  )
}
