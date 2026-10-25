import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Copy, Download, ExternalLink, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ProofSlip } from '../types'
import { APP_TYPE_LABEL, fmtDateTime } from '../lib/format'
import { sha256 } from '../lib/hash'
import { Button, CheckBadge, SimTag, StrengthBadge, useToast } from './ui'

export const proofUrl = (id: string) => `${window.location.origin}/verify/${id}`
export function digestMatches(p: ProofSlip) {
  const { digest, ...rest } = p
  return sha256(JSON.stringify(rest)) === digest
}

export function useQr(text: string) {
  const [url, setUrl] = useState('')
  useEffect(() => { QRCode.toDataURL(text, { margin: 1, width: 220, errorCorrectionLevel: 'M' }).then(setUrl).catch(() => setUrl('')) }, [text])
  return url
}

export function ProofSlipView({ p, instName }: { p: ProofSlip; instName?: string }) {
  const toast = useToast()
  const link = proofUrl(p.id)
  const qr = useQr(link)
  const download = () => {
    const html = `<!doctype html><meta charset="utf-8"><title>${p.id}</title><body style="font-family:system-ui;max-width:640px;margin:2rem auto"><h1>PRAMAAN proof slip</h1><p><b>Prototype proof slip — not an official AICTE approval.</b></p><p>Proof ${p.id}<br>Application ${p.appId} (${APP_TYPE_LABEL[p.type]})<br>Institution ${p.instCode}<br>Ruleset ${p.rulesetVersion}<br>Issued ${fmtDateTime(p.issuedAt)}<br>${p.officerDecision}</p><ul>${p.checks.map((c) => `<li>${c.name}: ${c.status}${c.strength ? ` (${c.strength}, simulated)` : ''}</li>`).join('')}</ul>${qr ? `<img src="${qr}" alt="QR"/>` : ''}<p>Integrity digest (SHA-256, not a signature): ${p.digest}</p><p>Verify at ${link} (works only in the browser that holds the record).</p></body>`
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' })); a.download = `${p.id}.html`; a.click(); URL.revokeObjectURL(a.href)
  }
  return (
    <div className="print-area rounded-2xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold tracking-[0.3em] text-accent">PRAMAAN · PROOF SLIP</div>
          <h2 className="mt-1 font-mono text-xl font-bold">{p.id}</h2>
          <div className="mt-2 inline-block rounded-lg border border-warn/50 bg-warn/10 px-2 py-1 text-xs font-bold text-warn">Prototype proof slip — not an official AICTE approval.</div>
        </div>
        {qr ? <img src={qr} alt={`QR code for ${p.id}`} className="h-28 w-28 rounded-lg bg-white p-1" /> : <div className="h-28 w-28 skeleton" />}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-xs text-muted">Application</dt><dd className="font-mono">{p.appId}</dd></div>
        <div><dt className="text-xs text-muted">Type</dt><dd>{APP_TYPE_LABEL[p.type]}</dd></div>
        <div><dt className="text-xs text-muted">Institution</dt><dd>{instName ?? p.instCode} <span className="text-muted">({p.instCode})</span></dd></div>
        <div><dt className="text-xs text-muted">Ruleset</dt><dd>{p.rulesetVersion}</dd></div>
        <div><dt className="text-xs text-muted">Issued</dt><dd>{fmtDateTime(p.issuedAt)}</dd></div>
        <div><dt className="text-xs text-muted">Audit reference</dt><dd>#{p.auditRef}</dd></div>
      </dl>
      <div className="mt-4 text-sm"><span className="text-xs text-muted">Officer decision recorded: </span><b>{p.officerDecision}</b></div>
      <table className="mt-3 w-full text-sm"><thead className="text-left text-xs text-muted"><tr><th className="py-1">Document check</th><th>Status</th><th>Strength</th></tr></thead>
        <tbody className="divide-y divide-line">{p.checks.map((c, i) => <tr key={i}><td className="py-1.5 pr-2">{c.name}</td><td><CheckBadge s={c.status} /></td><td><StrengthBadge s={c.strength} simulated={c.simulated} /></td></tr>)}</tbody></table>
      <p className="mt-3 break-all font-mono text-[11px] text-muted">Integrity digest (SHA-256): {p.digest}</p>
      <p className="mt-1 text-[11px] text-muted"><SimTag>Not a signature</SimTag> This digest only helps detect edits to the stored record in this browser. It is not a government signature.</p>
      <div className="no-print mt-4 flex flex-wrap gap-2">
        <Button size="sm" onClick={() => { void navigator.clipboard?.writeText(p.id); toast('ok', 'Proof ID copied.') }}><Copy className="h-3.5 w-3.5" /> Copy ID</Button>
        <Link to={`/verify/${p.id}`}><Button size="sm"><ExternalLink className="h-3.5 w-3.5" /> Open public verification</Button></Link>
        <Button size="sm" onClick={download}><Download className="h-3.5 w-3.5" /> Download HTML</Button>
        <Button size="sm" onClick={() => window.print()}><Printer className="h-3.5 w-3.5" /> Print</Button>
      </div>
    </div>
  )
}
