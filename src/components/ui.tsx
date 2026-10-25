import { createContext, useCallback, useContext, useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react'
import type { AppStatus, CheckStatus, FindingStatus, Severity, Strength } from '../types'
import { APP_STATUS_LABEL, CHECK_LABEL, FINDING_LABEL, STRENGTH_LABEL } from '../lib/format'

export const cn = (...a: (string | false | null | undefined)[]) => a.filter(Boolean).join(' ')

// ---------- Button ----------
type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
const BTN: Record<BtnVariant, string> = {
  primary: 'bg-brand text-[rgb(var(--bg))] font-semibold [box-shadow:var(--neu-out-sm)] hover:brightness-110 active:[box-shadow:var(--neu-in)]',
  secondary: 'bg-surface text-fg hover:text-brand active:[box-shadow:var(--neu-in)]',
  ghost: 'text-muted hover:text-fg hover:bg-raised',
  danger: 'bg-surface text-bad active:[box-shadow:var(--neu-in)]',
  success: 'bg-surface text-ok active:[box-shadow:var(--neu-in)]',
}
export function Button({ variant = 'secondary', size = 'md', className, ...p }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: 'sm' | 'md' }) {
  return (
    <button
      {...p}
      className={cn('inline-flex items-center justify-center gap-2 rounded-xl text-sm transition disabled:cursor-not-allowed disabled:opacity-45',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2', BTN[variant], className)}
    />
  )
}
export function LinkButton({ to, variant = 'secondary', size = 'md', className, children }: { to: string; variant?: BtnVariant; size?: 'sm' | 'md'; className?: string; children: ReactNode }) {
  return (
    <Link to={to} className={cn('inline-flex items-center justify-center gap-2 rounded-xl text-sm transition', size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-4 py-2', BTN[variant], className)}>
      {children}
    </Link>
  )
}

// ---------- Badges ----------
export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'cyan'
const TONE: Record<Tone, string> = {
  green: 'bg-ok/15 text-ok border-ok/30', amber: 'bg-warn/15 text-warn border-warn/30', red: 'bg-bad/15 text-bad border-bad/30',
  blue: 'bg-info/15 text-info border-info/30', gray: 'bg-muted/15 text-muted border-muted/30', cyan: 'bg-accent/15 text-accent border-accent/30',
}
export function Badge({ tone = 'gray', children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] font-semibold', TONE[tone], className)}>{children}</span>
}
const CHECK_TONE: Record<CheckStatus, Tone> = { VERIFIED: 'green', MISMATCH: 'red', EXPIRED: 'red', NOT_FOUND: 'amber', UNAVAILABLE: 'gray', MANUAL_REQUIRED: 'amber', PENDING: 'gray' }
export const CheckBadge = ({ s }: { s: CheckStatus }) => <Badge tone={CHECK_TONE[s]}>{CHECK_LABEL[s]}</Badge>
const APP_TONE: Record<AppStatus, Tone> = { DRAFT: 'gray', SUBMITTED: 'blue', PROCESSING: 'cyan', AWAITING_HUMAN_REVIEW: 'amber', IN_SCRUTINY: 'blue', RECTIFICATION_REQUESTED: 'amber', RESUBMITTED: 'cyan', RECOMMENDATION_RECORDED: 'green' }
export const AppBadge = ({ s }: { s: AppStatus }) => <Badge tone={APP_TONE[s]}>{APP_STATUS_LABEL[s]}</Badge>
const F_TONE: Record<FindingStatus, Tone> = { OPEN: 'amber', ACCEPTED: 'red', DISMISSED: 'gray', ESCALATED: 'red', NEEDS_EVIDENCE: 'blue', RESOLVED: 'green' }
export const FindingBadge = ({ s }: { s: FindingStatus }) => <Badge tone={F_TONE[s]}>{FINDING_LABEL[s]}</Badge>
export const SeverityBadge = ({ s }: { s: Severity }) => <Badge tone={s === 'HIGH' ? 'red' : s === 'MEDIUM' ? 'amber' : 'gray'}>{s}</Badge>
export const StrengthBadge = ({ s, simulated }: { s: Strength; simulated?: boolean }) =>
  s ? <span title={STRENGTH_LABEL[s]}><Badge tone="cyan">{s}</Badge></span> : <Badge tone="gray">No strength</Badge>
export const SimTag = (_: { children?: ReactNode }) => null

// ---------- Layout bits ----------
export const Card = ({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) => (
  <div {...p} className={cn('rounded-3xl border border-white/30 bg-surface dark:border-white/5', className)}>{children}</div>
)
export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">{title}</h1>{sub && <p className="mt-1 max-w-3xl text-sm text-muted">{sub}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}
const BAR: Record<Tone, string> = { green: 'bg-ok', amber: 'bg-warn', red: 'bg-bad', blue: 'bg-info', gray: 'bg-muted', cyan: 'bg-accent' }
export function Stat({ label, value, hint, tone = 'blue', to }: { label: string; value: ReactNode; hint?: string; tone?: Tone; to?: string }) {
  const inner = (
    <Card className="lift relative h-full overflow-hidden p-4">
      <div className={cn('absolute left-4 top-0 h-1 w-10 rounded-b-full', BAR[tone])} />
      <div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-1 text-3xl font-bold tabular-nums">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </Card>
  )
  return to ? <Link to={to} className="block">{inner}</Link> : inner
}
export function Progress({ value, tone = 'cyan', className }: { value: number; tone?: Tone; className?: string }) {
  return (
    <div className={cn('h-2 overflow-hidden rounded-full bg-raised', className)} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <motion.div className={cn('h-full rounded-full', BAR[tone])} animate={{ width: `${Math.min(100, Math.max(0, value))}%` }} transition={{ ease: 'easeOut', duration: 0.4 }} />
    </div>
  )
}
export function Empty({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <div className="font-semibold">{title}</div>
      {body && <p className="max-w-md text-sm text-muted">{body}</p>}
      {action}
    </div>
  )
}
export const Skeleton = ({ className }: { className?: string }) => <div className={cn('skeleton', className)} aria-hidden />
export function Callout({ tone = 'blue', children, title }: { tone?: Tone; children: ReactNode; title?: string }) {
  const Icon = tone === 'red' ? XCircle : tone === 'amber' ? AlertTriangle : tone === 'green' ? CheckCircle2 : Info
  return (
    <div className={cn('flex gap-3 rounded-xl border p-3 text-sm', TONE[tone])} role={tone === 'red' ? 'alert' : 'note'}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="text-fg">{title && <div className="font-semibold">{title}</div>}<div className="text-muted [&_b]:text-fg">{children}</div></div>
    </div>
  )
}
export function Tabs<T extends string>({ tabs, value, onChange, id = 'tabs' }: { tabs: { key: T; label: string; count?: number }[]; value: T; onChange: (k: T) => void; id?: string }) {
  return (
    <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-line">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={value === t.key} onClick={() => onChange(t.key)}
          className={cn('relative whitespace-nowrap px-3 py-2 text-sm font-medium transition', value === t.key ? 'text-fg' : 'text-muted hover:text-fg')}>
          {t.label}{t.count !== undefined && <span className="ml-1.5 rounded-full bg-raised px-1.5 text-[11px]">{t.count}</span>}
          {value === t.key && <motion.span layoutId={`tab-${id}`} className="absolute inset-x-0 -bottom-px h-0.5 bg-brand" />}
        </button>
      ))}
    </div>
  )
}

// ---------- Modal / confirm ----------
export function Modal({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const id = useId()
  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    ref.current?.focus()
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', h)
    return () => { document.removeEventListener('keydown', h); prev?.focus() }
  }, [open, onClose])
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={onClose}>
          <motion.div ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={id}
            initial={{ y: 16, scale: 0.97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 8, opacity: 0 }}
            onMouseDown={(e) => e.stopPropagation()}
            className={cn('max-h-[90vh] w-full overflow-auto rounded-2xl border border-line bg-surface p-5  outline-none', wide ? 'max-w-3xl' : 'max-w-lg')}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <h2 id={id} className="text-lg font-bold">{title}</h2>
              <button onClick={onClose} aria-label="Close dialog" className="rounded-lg p-1 text-muted hover:bg-raised"><X className="h-4 w-4" /></button>
            </div>
            <div className="text-sm">{children}</div>
            {footer && <div className="mt-5 flex flex-wrap justify-end gap-2">{footer}</div>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function Confirm({ open, onClose, title, body, confirmLabel, tone = 'primary', reasonLabel, reasonRequired, onConfirm }: {
  open: boolean; onClose: () => void; title: string; body: ReactNode; confirmLabel: string; tone?: BtnVariant
  reasonLabel?: string; reasonRequired?: boolean; onConfirm: (reason: string) => string | void | Promise<string | void>
}) {
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  useEffect(() => { if (open) { setReason(''); setErr('') } }, [open])
  const submit = async () => {
    if (reasonRequired && reason.trim().length < 8) { setErr('A reason of at least 8 characters is required.'); return }
    const r = await onConfirm(reason)
    if (typeof r === 'string') setErr(r)
    else onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title={title}
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant={tone} onClick={submit}>{confirmLabel}</Button></>}>
      <div className="space-y-3">
        <div className="text-muted">{body}</div>
        {reasonLabel && (
          <label className="block">
            <span className="mb-1 block text-xs font-semibold">{reasonLabel}{reasonRequired && <span className="text-bad"> *</span>}</span>
            <textarea value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} rows={3}
              className="w-full rounded-xl border border-line bg-bg p-2 text-sm" aria-invalid={!!err} />
          </label>
        )}
        {err && <div role="alert" className="rounded-lg border border-bad/40 bg-bad/10 p-2 text-sm text-bad">{err}</div>}
      </div>
    </Modal>
  )
}

// ---------- Toasts ----------
type ToastItem = { id: number; tone: 'ok' | 'bad' | 'info'; text: string }
const ToastCtx = createContext<(tone: ToastItem['tone'], text: string) => void>(() => {})
export const useToast = () => useContext(ToastCtx)
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((tone: ToastItem['tone'], text: string) => {
    const id = Date.now() + Math.random()
    setItems((x) => [...x, { id, tone, text }])
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 5200)
  }, [])
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2" aria-live="polite">
        <AnimatePresence>
          {items.map((t) => (
            <motion.div key={t.id} layout initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
              className={cn('pointer-events-auto flex gap-2 rounded-xl border bg-surface p-3 text-sm ', t.tone === 'ok' ? 'border-ok/50' : t.tone === 'bad' ? 'border-bad/50' : 'border-info/50')}>
              {t.tone === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 text-ok" /> : t.tone === 'bad' ? <XCircle className="h-4 w-4 shrink-0 text-bad" /> : <Info className="h-4 w-4 shrink-0 text-info" />}
              <span>{t.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  )
}

export function AnimatedNumber({ value }: { value: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0
    const t0 = performance.now()
    const step = (t: number) => { const p = Math.min(1, (t - t0) / 700); setN(Math.round(value * p)); if (p < 1) raf = requestAnimationFrame(step) }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [value])
  return <>{n}</>
}

export const Th = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <th className={cn('whitespace-nowrap px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted', className)}>{children}</th>
)
export const Td = ({ children, className, ...p }: React.TdHTMLAttributes<HTMLTableCellElement>) => <td {...p} className={cn('px-3 py-2.5 align-middle', className)}>{children}</td>
export const inputCls = 'w-full rounded-xl bg-bg px-3 py-2 text-sm placeholder:text-muted/70'
