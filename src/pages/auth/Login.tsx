import { useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, ClipboardCheck, Eye, ScanSearch, Settings } from 'lucide-react'
import { actions, useStore } from '../../lib/store'
import { ROLE_LABEL } from '../../lib/format'
import { Logo, roleHome, ThemeToggle } from '../../components/Shell'
import { Badge, Callout, useToast } from '../../components/ui'
import type { Role } from '../../types'

const ICON: Record<Role, typeof Building2> = { institution: Building2, scrutiny: ScanSearch, senior: ClipboardCheck, admin: Settings, auditor: Eye }
const BLURB: Record<Role, string> = {
  institution: 'Create applications, upload documents, watch verification, rectify.',
  scrutiny: 'Review findings with evidence, accept or dismiss, approve notices.',
  senior: 'Record recommendations — blocked while high-severity findings remain.',
  admin: 'Manage rulesets (draft → preview → approve → activate), users, demo data.',
  auditor: 'Read-only access to the work queue and the hash-chained audit log.',
}

export default function Login() {
  const s = useStore()
  const nav = useNavigate()
  const toast = useToast()
  const [params] = useSearchParams()
  const next = params.get('next')
  const as = params.get('as') as Role | null

  const signIn = (id: string) => {
    const r = actions.login(id)
    if (!r.ok) { toast('bad', r.error); return }
    nav(next && next.startsWith('/') ? next : roleHome(r.data))
  }
  useEffect(() => {
    if (as) { const u = s.users.find((x) => x.role === as && x.active); if (u && !s.session) signIn(u.id) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const demoUsers = ['U-INST', 'U-OFF', 'U-SEN', 'U-ADM', 'U-AUD'].map((id) => s.users.find((u) => u.id === id)!).filter(Boolean)
  return (
    <div className="min-h-screen bg-aurora">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><Link to="/"><Logo className="text-lg" /></Link><ThemeToggle /></header>
      <main className="mx-auto max-w-5xl px-4 pb-16 pt-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Choose a demo role</h1>
        <p className="mt-1 text-muted">Pick a synthetic account to explore. There is no password — sign-in is simulated.</p>
        <div className="mt-4"><Callout tone="amber" title="Demo mode">Authentication and permissions are simulated in the browser. Role checks demonstrate workflow rules and are <b>not</b> production security. Demo identities are not real email accounts.</Callout></div>
        {s.session && <p className="mt-3 text-sm text-muted">Currently signed in as <b className="text-fg">{ROLE_LABEL[s.session.role]}</b>. Choosing another account switches role.</p>}
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {demoUsers.map((u, i) => {
            const Icon = ICON[u.role]
            return (
              <motion.button key={u.id} onClick={() => signIn(u.id)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                className="group rounded-2xl border border-line bg-surface p-5 text-left transition hover:border-brand/70 hover:shadow-card focus-visible:border-brand">
                <div className="flex items-center justify-between"><span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/15 text-brand"><Icon className="h-5 w-5" /></span>
                  <Badge tone={u.role === 'institution' ? 'blue' : 'cyan'}>{u.role === 'institution' ? 'Institution Portal' : 'Officer Console'}</Badge></div>
                <div className="mt-3 font-semibold">{ROLE_LABEL[u.role]}</div>
                <div className="text-sm">{u.name}</div>
                <div className="font-mono text-xs text-muted">{u.email}</div>
                <p className="mt-2 text-xs text-muted">{BLURB[u.role]}</p>
              </motion.button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
