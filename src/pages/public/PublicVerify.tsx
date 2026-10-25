import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Search, ShieldAlert, ShieldCheck } from 'lucide-react'
import { useStore } from '../../lib/store'
import { Logo, ThemeToggle } from '../../components/Shell'
import { Button, Callout, inputCls } from '../../components/ui'
import { digestMatches, ProofSlipView } from '../../components/ProofSlipView'

export default function PublicVerify() {
  const { proofId } = useParams()
  const nav = useNavigate()
  const s = useStore()
  const [q, setQ] = useState(proofId ?? '')
  useEffect(() => setQ(proofId ?? ''), [proofId])
  const clean = (v: string) => v.trim().split('/').pop()!.toUpperCase()
  const proof = proofId ? s.proofs.find((p) => p.id === clean(proofId)) : undefined
  return (
    <div className="min-h-screen bg-aurora">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4"><Link to="/"><Logo className="text-lg" /></Link><ThemeToggle /></header>
      <main className="mx-auto max-w-3xl space-y-4 px-4 pb-16">
        <h1 className="text-3xl font-extrabold tracking-tight">Public proof verification</h1>
        <p className="text-muted">Enter a proof identifier (or paste the QR link) to look it up. This page needs no sign-in.</p>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (q.trim()) nav(`/verify/${clean(q)}`) }}>
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted" /><input aria-label="Proof identifier" value={q} onChange={(e) => setQ(e.target.value)} placeholder="PRF-XXXXXXXXXX" className={`${inputCls} pl-9 font-mono`} /></div>
          <Button variant="primary" type="submit">Verify</Button>
        </form>
        {s.proofs.length > 0 && !proofId && <p className="text-xs text-muted">Try a sample in this browser: {s.proofs.slice(0, 3).map((p) => <Link key={p.id} to={`/verify/${p.id}`} className="mr-2 font-mono text-brand">{p.id}</Link>)}</p>}

        {proofId && !proof && (
          <Callout tone="red" title="No record found in this browser"><ShieldAlert className="mb-1 inline h-4 w-4" /> “{clean(proofId)}” does not exist in this browser’s demo store. This does not prove the slip is invalid: records are browser-local and cannot be verified from another person’s browser.</Callout>
        )}
        {proof && (
          <>
            <Callout tone={digestMatches(proof) ? 'green' : 'red'} title={digestMatches(proof) ? 'Record found · integrity digest matches' : 'Record found · integrity digest does NOT match'}>
              <ShieldCheck className="mb-1 inline h-4 w-4" /> {digestMatches(proof) ? 'The stored record has not been edited since it was generated in this browser.' : 'The stored record differs from the digest recorded at generation.'}
            </Callout>
            <ProofSlipView p={proof} instName={s.institutions.find((i) => i.id === proof.instId)?.name} />
          </>
        )}

        <div className="rounded-2xl border border-line bg-surface p-4 text-sm">
          <h2 className="mb-1 font-semibold">What this proves — and what it does not</h2>
          <ul className="list-disc space-y-1 pl-5 text-muted">
            <li>It shows the checks and statuses recorded for a synthetic application in this demo.</li>
            <li>It is <b className="text-fg">not</b> an official AICTE approval, certificate or decision.</li>
            <li>The digest is a SHA-256 hash of the record, not a cryptographic signature from any authority.</li>
            <li>Verification strengths and source responses shown here are simulated.</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
