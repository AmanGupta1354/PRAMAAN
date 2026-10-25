import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell, BookOpenCheck, ClipboardList, FilePlus2, FileText, Gauge, LayoutDashboard, ListChecks, LogOut, Menu, Moon,
  PanelLeftClose, PanelLeftOpen, Plug, QrCode, ScrollText, Settings2, ShieldCheck, Sun, Target, Trash2, UserCog, Users, X, BarChart3,
} from 'lucide-react'
import { actions, currentUser, useStore } from '../lib/store'
import { ROLE_LABEL } from '../lib/format'
import type { Role } from '../types'
import { Button, Callout, cn, Confirm, useToast } from './ui'
import { useTheme } from '../lib/theme'

export const roleHome = (r: Role) => (r === 'institution' ? '/institution' : r === 'auditor' ? '/officer/audit' : '/officer')

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2 font-extrabold tracking-tight', className)}>
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
        <rect width="64" height="64" rx="14" className="fill-[#0b1a3a]" />
        <path d="M32 10 50 18v14c0 11-8 19-18 22C22 51 14 43 14 32V18z" fill="none" stroke="#22d3ee" strokeWidth="4" />
        <path d="m24 32 6 6 11-12" fill="none" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      PRAMAAN
    </span>
  )
}

export function ThemeToggle() {
  const { dark, toggle } = useTheme()
  return (
    <button onClick={toggle} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'} className="rounded-xl bg-surface p-2 text-muted hover:text-fg neu-press">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  )
}

export function Guard({ roles, children }: { roles: Role[]; children?: ReactNode }) {
  const s = useStore()
  const loc = useLocation()
  if (!s.session) return <Navigate to={`/login?next=${encodeURIComponent(loc.pathname)}`} replace />
  if (!roles.includes(s.session.role)) {
    return (
      <div className="mx-auto mt-24 max-w-md space-y-4 p-6">
        <Callout tone="amber" title="This area is not available to your current demo role">
          You are signed in as <b>{ROLE_LABEL[s.session.role]}</b>. This area is for {roles.map((r) => ROLE_LABEL[r]).join(' / ')}. Role checks in this prototype are a frontend demonstration, not production security.
        </Callout>
        <div className="flex gap-2"><Link to={roleHome(s.session.role)}><Button variant="primary">Go to my workspace</Button></Link><Link to="/login"><Button>Switch account</Button></Link></div>
      </div>
    )
  }
  return <>{children ?? <Outlet />}</>
}

type NavItem = { to: string; label: string; icon: ReactNode; end?: boolean; roles?: Role[] }
const INST_NAV: NavItem[] = [
  { to: '/institution', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true },
  { to: '/institution/applications', label: 'Applications', icon: <ClipboardList className="h-4 w-4" /> },
  { to: '/institution/applications/new', label: 'New application', icon: <FilePlus2 className="h-4 w-4" /> },
  { to: '/institution/proofs', label: 'Proof slips', icon: <QrCode className="h-4 w-4" /> },
  { to: '/institution/notifications', label: 'Notifications', icon: <Bell className="h-4 w-4" /> },
]
const OFF_NAV: NavItem[] = [
  { to: '/officer', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, end: true, roles: ['scrutiny', 'senior', 'admin'] },
  { to: '/officer/queue', label: 'Work queue', icon: <ListChecks className="h-4 w-4" />, roles: ['scrutiny', 'senior', 'admin', 'auditor'] },
  { to: '/officer/planner', label: 'Inspection planner', icon: <Target className="h-4 w-4" />, roles: ['scrutiny', 'senior', 'admin'] },
  { to: '/officer/audit', label: 'Audit log', icon: <ScrollText className="h-4 w-4" />, roles: ['scrutiny', 'senior', 'admin', 'auditor'] },
]
const ADMIN_NAV: NavItem[] = [
  { to: '/officer/admin/rulesets', label: 'Rulesets', icon: <BookOpenCheck className="h-4 w-4" />, roles: ['admin'] },
  { to: '/officer/admin/checklists', label: 'Checklists', icon: <Settings2 className="h-4 w-4" />, roles: ['admin'] },
  { to: '/officer/admin/users', label: 'Users', icon: <Users className="h-4 w-4" />, roles: ['admin'] },
  { to: '/officer/admin/sources', label: 'Source adapters', icon: <Plug className="h-4 w-4" />, roles: ['admin'] },
  { to: '/officer/admin/accuracy', label: 'Check accuracy', icon: <BarChart3 className="h-4 w-4" />, roles: ['admin'] },
  { to: '/officer/admin/demo', label: 'Demo data', icon: <Trash2 className="h-4 w-4" />, roles: ['admin'] },
]

function Crumbs() {
  const { pathname } = useLocation()
  const parts = pathname.split('/').filter(Boolean)
  return (
    <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1 text-xs text-muted sm:flex">
      {parts.map((p, i) => (
        <span key={i} className="flex items-center gap-1 truncate">
          {i > 0 && <span>/</span>}
          <Link to={'/' + parts.slice(0, i + 1).join('/')} className={cn('truncate capitalize hover:text-fg', i === parts.length - 1 && 'font-semibold text-fg')}>{p}</Link>
        </span>
      ))}
    </nav>
  )
}

export function Shell({ area }: { area: 'institution' | 'officer' }) {
  const s = useStore()
  const user = currentUser(s)
  const nav = useNavigate()
  const loc = useLocation()
  const toast = useToast()
  const [collapsed, setCollapsed] = useState(false)
  const [mobile, setMobile] = useState(false)
  const [menu, setMenu] = useState(false)
  const [confirmOut, setConfirmOut] = useState(false)
  useEffect(() => { setMobile(false); setMenu(false) }, [loc.pathname])
  const role = s.session?.role
  const items = area === 'institution' ? INST_NAV : OFF_NAV
  const unread = s.notifications.filter((n) => !n.read && n.instId === user?.instId).length

  const NavList = (
    <nav className="flex flex-col gap-1 p-2" aria-label="Main">
      {items.filter((i) => !i.roles || (role && i.roles.includes(role))).map((i) => (
        <NavLink key={i.to} to={i.to} end={i.end} title={i.label}
          className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition', isActive ? 'neu-pressed font-semibold text-brand' : 'text-muted hover:text-fg')}>
          {i.icon}{!collapsed && <span className="truncate">{i.label}</span>}
          {!collapsed && i.label === 'Notifications' && unread > 0 && <span className="ml-auto rounded-full bg-warn px-1.5 text-[10px] font-bold text-black">{unread}</span>}
        </NavLink>
      ))}
      {area === 'officer' && role === 'admin' && (
        <>
          {!collapsed && <div className="mt-3 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted">Administration</div>}
          {ADMIN_NAV.map((i) => (
            <NavLink key={i.to} to={i.to} title={i.label}
              className={({ isActive }) => cn('flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition', isActive ? 'neu-pressed font-semibold text-brand' : 'text-muted hover:text-fg')}>
              {i.icon}{!collapsed && <span className="truncate">{i.label}</span>}
            </NavLink>
          ))}
        </>
      )}
    </nav>
  )

  const switchTo = (id: string) => {
    const r = actions.login(id)
    if (!r.ok) { toast('bad', r.error); return }
    toast('info', `Switched demo account (${ROLE_LABEL[r.data]}).`)
    nav(roleHome(r.data))
  }

  return (
    <div className={cn('min-h-screen', area === 'officer' && 'officer-theme')}>
      <div className="no-print bg-warn/10 px-3 py-1 text-center text-[11px] font-medium text-warn">
        DEMO MODE · Frontend-only prototype · Authentication, verification and official sources are simulated · Data lives in this browser only
      </div>
      <div className="flex">
        <aside className={cn('no-print sticky top-3 m-3 hidden h-[calc(100vh-1.5rem)] shrink-0 flex-col rounded-3xl bg-surface md:flex', collapsed ? 'w-16' : 'w-60')}>
          <div className="flex h-14 items-center justify-between border-b border-line px-3">
            {!collapsed && <Logo />}
            <button onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} className="rounded-lg p-1.5 text-muted hover:bg-raised">
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">{NavList}</div>
          {!collapsed && (
            <div className="border-t border-line p-3 text-[11px] text-muted">
              <ShieldCheck className="mb-1 inline h-3.5 w-3.5 text-accent" /> AI suggests. The authorized officer decides.
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="no-print sticky top-3 z-30 mx-3 mt-3 flex h-14 items-center gap-3 rounded-2xl bg-surface px-3 sm:px-5">
            <button onClick={() => setMobile(true)} aria-label="Open menu" className="rounded-lg p-2 text-muted hover:bg-raised md:hidden"><Menu className="h-5 w-5" /></button>
            <Link to="/" className="md:hidden"><Logo /></Link>
            <Crumbs />
            <span className={cn('ml-auto hidden rounded-full border px-2 py-0.5 text-[11px] font-semibold lg:inline', area === 'officer' ? 'border-accent/40 text-accent' : 'border-info/40 text-info')}>
              {area === 'officer' ? 'AICTE Officer Console' : 'Institution Portal'}
            </span>
            <ThemeToggle />
            <div className="relative">
              <button onClick={() => setMenu((m) => !m)} aria-haspopup="menu" aria-expanded={menu} className="flex items-center gap-2 rounded-xl bg-surface px-2.5 py-1.5 text-left text-xs neu-press">
                <UserCog className="h-4 w-4 text-muted" />
                <span className="hidden sm:block"><span className="block font-semibold leading-tight">{user?.name}</span><span className="block text-muted leading-tight">{role && ROLE_LABEL[role]}</span></span>
              </button>
              <AnimatePresence>
                {menu && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="menu"
                    className="absolute right-0 mt-2 w-72 rounded-2xl border border-line bg-surface p-2 ">
                    <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-widest text-muted">Switch demo account</div>
                    {s.users.filter((u) => u.active).map((u) => (
                      <button key={u.id} role="menuitem" onClick={() => switchTo(u.id)}
                        className={cn('flex w-full flex-col rounded-xl px-2 py-1.5 text-left text-xs hover:bg-raised', u.id === user?.id && 'bg-brand/10')}>
                        <span className="font-semibold">{u.name} <span className="font-normal text-muted">· {ROLE_LABEL[u.role]}</span></span>
                        <span className="text-muted">{u.email}</span>
                      </button>
                    ))}
                    <hr className="my-1 border-line" />
                    <button onClick={() => { setMenu(false); setConfirmOut(true) }} role="menuitem" className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-xs text-bad hover:bg-bad/10"><LogOut className="h-3.5 w-3.5" /> Log out</button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </header>
          <main className="min-w-0 flex-1 p-4 sm:p-6">
            <motion.div key={loc.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <Outlet />
            </motion.div>
          </main>
          <footer className="no-print px-6 py-3 text-center text-[11px] text-muted">
            PRAMAAN prototype · Not affiliated with or endorsed by AICTE · Synthetic data only · Handbook in, evidence out, officer decides.
          </footer>
        </div>
      </div>

      <AnimatePresence>
        {mobile && (
          <motion.div className="fixed inset-0 z-50 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-black/60" onClick={() => setMobile(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }} className="relative h-full w-72 max-w-[85vw] overflow-y-auto border-r border-line bg-surface">
              <div className="flex h-14 items-center justify-between border-b border-line px-3"><Logo />
                <button onClick={() => setMobile(false)} aria-label="Close menu" className="rounded-lg p-2 text-muted hover:bg-raised"><X className="h-5 w-5" /></button></div>
              {NavList}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>
      <Confirm open={confirmOut} onClose={() => setConfirmOut(false)} title="Log out of demo?" confirmLabel="Log out" body="Your demo data stays in this browser. You can sign back in with any demo account."
        onConfirm={() => { actions.logout(); nav('/') }} />
    </div>
  )
}
export { FileText, Gauge }
