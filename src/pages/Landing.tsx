import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
  ArrowRight, Check, Cpu, Eye, FileSearch, Fingerprint, Gavel, Layers, Network, PlayCircle, ScanLine, ScrollText, ShieldCheck, Users2,
} from 'lucide-react'
import { Logo, ThemeToggle } from '../components/Shell'
import { cn, LinkButton } from '../components/ui'
import { STAGE_DEFS } from '../lib/verificationPlan'

const STAGE_ICONS = [FileSearch, ScanLine, Cpu, ScrollText, Fingerprint, Network, Users2, ShieldCheck]

function HeroViz() {
  const [i, setI] = useState(0)
  useEffect(() => { const t = setInterval(() => setI((x) => (x + 1) % (STAGE_DEFS.length + 2)), 1100); return () => clearInterval(t) }, [])
  const active = Math.min(i, STAGE_DEFS.length - 1)
  const mx = useMotionValue(0), my = useMotionValue(0)
  const rotY = useSpring(useTransform(mx, [-1, 1], [-22, -6]), { stiffness: 80, damping: 18 })
  const rotX = useSpring(useTransform(my, [-1, 1], [12, 0]), { stiffness: 80, damping: 18 })
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    mx.set(((e.clientX - r.left) / r.width) * 2 - 1); my.set(((e.clientY - r.top) / r.height) * 2 - 1)
  }
  const Z = (z: number) => ({ transform: `translateZ(${z}px)` })
  return (
    <div className="scene relative px-2 py-6" onMouseMove={onMove} onMouseLeave={() => { mx.set(0); my.set(0) }} role="img"
      aria-label="Illustrative animation of a document passing through verification stages">
      <div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-widest text-muted">
        
      </div>
      <motion.div className="scene-layer relative mx-auto max-w-md" style={{ rotateY: rotY, rotateX: rotX }}>
        <div className="floor-shadow" />
        <div className="rounded-[2rem] bg-surface p-5" style={Z(0)}>
          <div className="grid grid-cols-[1fr_1.1fr] gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-xl bg-white p-3 text-[8px] text-slate-600" style={{ ...Z(46), boxShadow: '14px 18px 30px rgb(0 0 0 / .25)' }}>
              <b className="text-slate-900">FIRE SAFETY CERTIFICATE</b>
              <div className="mt-2 space-y-1.5">{[88, 70, 80, 52, 76, 64, 84].map((w, k) => <div key={k} className="h-[3px] rounded bg-slate-200" style={{ width: `${w}%` }} />)}</div>
              <motion.div className="absolute left-2 right-2 rounded border-2 border-brand" animate={{ opacity: active >= 2 ? 1 : 0 }} style={{ top: '58%', height: '8%' }} />
              <div className="scanline" />
            </div>
            <ul className="space-y-1.5" style={Z(24)}>
              {STAGE_DEFS.map(([id, name], k) => {
                const Icon = STAGE_ICONS[k]
                const done = k < i, cur = k === i
                return (
                  <li key={id} className={cn('flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition', cur ? 'neu-pressed text-brand' : 'bg-surface neu-sm', done && 'text-ok')}>
                    <span className="grid h-5 w-5 place-items-center">{done ? <Check className="h-3.5 w-3.5" /> : <Icon className={cn('h-3.5 w-3.5', cur ? 'text-brand' : 'text-muted')} />}</span>
                    <span className={cn(!done && !cur && 'text-muted')}>{name}</span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={i >= STAGE_DEFS.length ? 'done' : 'run'} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="absolute -bottom-5 left-1/2 w-max max-w-[92%] -translate-x-1/2 text-center rounded-full bg-surface px-4 py-2 text-xs font-semibold" style={Z(90)}>
            {i >= STAGE_DEFS.length ? <span className="text-warn">Findings ready — officer review required</span> : <span className="text-brand">Stage {active + 1}/8 · {STAGE_DEFS[active][1]}</span>}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

const FEATURES = [
  [FileSearch, 'Evidence, not verdicts', 'Every finding carries its rule, page reference, confidence and verification strength.'],
  [Layers, 'Two connected portals', 'Institutions prepare and submit. Officers scrutinise the same record in a separate console.'],
  [Gavel, 'Six human gates', 'Submission, uncertain values, findings, notices, recommendations and rules all need a person.'],
  [Eye, 'Clear verification status', 'Every result shows its source, strength and status.'],
] as const

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <Logo className="text-lg" />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <LinkButton to="/login" variant="secondary" size="sm">Sign in</LinkButton>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-8 lg:grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
          <p className="mb-3 text-sm font-semibold text-brand">Handbook in, evidence out, officer decides.</p>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">AI that checks.<br />Officers who decide.</h1>
          <p className="mt-4 max-w-xl text-lg text-muted">Evidence-led application scrutiny for trusted technical education approvals.</p>
          <div className="mt-7 flex flex-wrap gap-3">
            <LinkButton to="/login?as=institution" variant="primary" className="px-5 py-2.5">Explore Institution Portal <ArrowRight className="h-4 w-4" /></LinkButton>
            <LinkButton to="/login?as=scrutiny" className="px-5 py-2.5">Open AICTE Console</LinkButton>
            <a href="#workflow" className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm text-muted hover:text-fg"><PlayCircle className="h-4 w-4" /> View Demo Workflow</a>
          </div>
          <p className="mt-6 max-w-xl rounded-xl border border-line bg-surface/60 p-3 text-xs text-muted">
            PRAMAAN assists verification. Final decisions remain with authorized officers.
          </p>
        </motion.div>
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.15 }}><HeroViz /></motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(([Icon, t, b]) => (
            <div key={t} className="rounded-3xl bg-surface p-5">
              <Icon className="mb-3 h-6 w-6 text-accent" /><div className="font-semibold">{t}</div><p className="mt-1 text-sm text-muted">{b}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-14">
        <h2 className="text-2xl font-bold">The eight-stage verification pipeline</h2>
        <p className="mt-1 text-sm text-muted">Every stage is visible to the institution and recorded for the officer.</p>
        <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {STAGE_DEFS.map(([id, name, blurb], k) => {
            const Icon = STAGE_ICONS[k]
            return (
              <li key={id} className="rounded-3xl bg-surface p-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-brand"><Icon className="h-4 w-4" />Stage {k + 1}</div>
                <div className="mt-1 font-semibold">{name}</div><p className="mt-1 text-xs text-muted">{blurb}</p>
              </li>
            )
          })}
        </ol>
      </section>

      <section id="workflow" className="mx-auto max-w-6xl scroll-mt-6 px-4 pb-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl bg-surface p-6">
            <h2 className="text-xl font-bold">Human-in-the-loop principles</h2>
            <ol className="mt-3 space-y-2 text-sm">
              {['Institution submits the application', 'Uncertain extracted values need confirmation', 'Officers review findings and record decisions', 'Officers approve outbound notices', 'Senior recommendation only with no unresolved high-severity findings', 'Administrators approve rulesets before activation'].map((g, k) => (
                <li key={g} className="flex gap-3"><span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand/15 text-xs font-bold text-brand">{k + 1}</span><span className="text-muted">{g}</span></li>
              ))}
            </ol>
            <p className="mt-4 text-sm font-semibold text-accent">AI suggests. The authorized officer decides.</p>
          </div>
          <div className="rounded-3xl bg-surface p-6">
            <h2 className="text-xl font-bold">Trust and transparency</h2>
            <ul className="mt-3 space-y-2 text-sm text-muted">
              <li>• A timeout is <i>unavailable</i>, never a mismatch. A missing record never means a forgery.</li>
              <li>• Forensic heuristics are indicators for review, not proof.</li>
              <li>• File fingerprints (SHA-256) and arithmetic checks are computed in your browser.</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2"><LinkButton to="/verify" size="sm">Open public proof verification</LinkButton><LinkButton to="/login" size="sm" variant="ghost">Choose a demo role</LinkButton></div>
          </div>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-6 text-center text-xs text-muted">
        PRAMAAN · Handbook in, evidence out, officer decides.
      </footer>
    </div>
  )
}
