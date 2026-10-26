import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-10">
      <div className="absolute right-4 top-4"><ThemeToggle /></div>
      <form onSubmit={submit} className="w-full max-w-sm rounded-3xl bg-surface p-7" noValidate>
        <Link to="/" className="mb-6 flex justify-center"><Logo className="text-xl" /></Link>
        <h1 className="text-center text-xl font-bold">Sign in</h1>
        <div className="mt-6 space-y-4">
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
          <Button type="submit" variant="primary" className="w-full py-2.5">Sign in</Button>
        </div>
        <Link to="/" className="mt-5 block text-center text-sm text-muted hover:text-fg">← Back to home</Link>
      </form>
      <details className="mt-5 w-full max-w-sm text-center text-xs text-muted">
        <summary className="cursor-pointer">Demo accounts</summary>
        <p className="mt-2">Password for all: <span className="font-mono text-fg">{DEMO_PASSWORD}</span></p>
        <ul className="mt-1 space-y-0.5">
          {s.users.filter((u) => u.active).map((u) => <li key={u.id}><span className="font-mono">{u.email}</span> · {ROLE_LABEL[u.role]}</li>)}
        </ul>
      </details>
    </div>
  )
}
