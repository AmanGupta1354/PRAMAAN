import { useState } from 'react'
import { QrCode } from 'lucide-react'
import { useStore } from '../../lib/store'
import { useMyApps } from '../../lib/hooks'
import { Empty, PageHeader, Tabs, Callout } from '../../components/ui'
import { ProofSlipView } from '../../components/ProofSlipView'

export default function Proofs() {
  const s = useStore()
  const apps = useMyApps()
  const proofs = s.proofs.filter((p) => apps.some((a) => a.id === p.appId))
  const [sel, setSel] = useState('')
  const cur = proofs.find((p) => p.id === sel) ?? proofs[0]
  return (
    <>
      <PageHeader title="Proof slips" sub="Prototype artifacts summarising recorded verification results. Generate them from an application that has completed verification." />
      <Callout tone="amber" title="Prototype only">Proof records live in this browser’s localStorage, so they can be verified here but not from another person’s browser. No cryptographic signature is applied.</Callout>
      <div className="mt-5">
        {proofs.length === 0 ? <Empty icon={<QrCode className="h-8 w-8" />} title="No proof slips yet" body="Open a verified application and choose “Generate proof slip”." /> : (
          <div className="space-y-4">
            <Tabs id="proofs" value={cur.id} onChange={setSel} tabs={proofs.map((p) => ({ key: p.id, label: p.id }))} />
            <ProofSlipView p={cur} instName={s.institutions.find((i) => i.id === cur.instId)?.name} />
          </div>
        )}
      </div>
    </>
  )
}
