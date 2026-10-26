import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Eye, EyeOff, LogIn } from 'lucide-react'
import { actions, useStore } from '../../lib/store'
import { ROLE_LABEL } from '../../lib/format'
import { DEMO_PASSWORD } from '../../data/seed'
import { Logo, roleHome, ThemeToggle } from '../../components/Shell'
import { Button, inputCls } from '../../components/ui'

export default function Login() {
  const s = useStore()
  const nav = useNavigate()
  const [params] = useSearchParams()
  const next = params.get('next')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) { setError('Enter your email and password.'); return }
    const r = actions.signIn(email, password)
    if (!r.ok) { setError(r.error); return }
    nav(next && next.startsWith('/') && !next.startsWith('//') ? next : roleHome(r.data))
  }

  const accounts = s.users.filter((u) => u.active)
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4"><Link to="/"><Logo className="text-lg" /></Link><ThemeToggle /></header>
      <main className="mx-auto grid max-w-5xl items-start gap-8 px-4 pb-16 pt-6 lg:grid-cols-[1fr_24rem]">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-4xl font-extrabold tracking-tight">Sign in to PRAMAAN</h1>
          <p className="mt-2 max-w-md text-muted">Your account decides what you see: institutions get the application portal, AICTE officials get the scrutiny console.</p>
          <details className="mt-8 max-w-md rounded-3xl bg-surface p-4 text-sm">
            <summary className="cursor-pointer font-semibold">Demo credentials</summary>
            <p className="mt-2 text-xs text-muted">Shared password for every account: <span className="font-mono text-fg">{DEMO_PASSWORD}</span></p>
            <ul className="mt-2 space-y-1.5 text-xs">
              {accounts.map((u) => <li key={u.id} className="flex justify-between gap-3"><span className="font-mono">{u.email}</span><span className="text-muted">{ROLE_LABEL[u.role]}</span></li>)}
            </ul>
          </details>
        </motion.div>
        <motion.form onSubmit={submit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="space-y-4 rounded-3xl bg-surface p-6" noValidate>
          <label className="block text-sm font-semibold">Email
            <input type="email" autoComplete="username" value={email} onChange={(e) => { setEmail(e.target.value); setError('') }} className={`${inputCls} mt-1`} placeholder="you@institution.org" />
          </label>
          <label className="block text-sm font-semibold">Password
            <span className="relative mt-1 block">
              <input type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }} className={`${inputCls} pr-10`} />
              <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? 'Hide password' : 'Show password'} className="absolute right-2 top-2 text-muted hover:text-fg">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </span>
          </label>
          {error && <div role="alert" className="rounded-xl bg-bad/10 p-2.5 text-sm text-bad">{error}</div>}
          <Button type="submit" variant="primary" className="w-full py-2.5"><LogIn className="h-4 w-4" /> Sign in</Button>
        </motion.form>
      </main>
    </div>
  )
}
