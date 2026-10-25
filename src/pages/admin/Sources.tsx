import { useStore } from '../../lib/store'
import { Badge, Callout, Card, PageHeader, SimTag, StrengthBadge } from '../../components/ui'
import { STRENGTH_LABEL } from '../../lib/format'

export default function Sources() {
  const s = useStore()
  return (
    <>
      <PageHeader title="Source adapters" sub="Configured verification sources and their status." />
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {s.sources.map((a) => (
          <Card key={a.id} className="p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">{a.name}</h2><Badge tone={a.status === 'SIMULATED' ? 'amber' : 'gray'}>{a.status === 'SIMULATED' ? 'CONFIGURED' : 'UNAVAILABLE'}</Badge></div>
            <p className="text-xs text-muted">{a.kind} · {a.id}</p>
            <div className="mt-2 flex items-center gap-2 text-xs text-muted">Target strength: <StrengthBadge s={a.strength} simulated />{a.strength && <span>{STRENGTH_LABEL[a.strength]}</span>}</div><div className="mt-2"><SimTag>SIMULATED SOURCE</SimTag></div></Card>
        ))}
      </div>
    </>
  )
}
