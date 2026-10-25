import { useStore } from '../../lib/store'
import { Callout, Card, PageHeader, Progress, SimTag } from '../../components/ui'

export default function Accuracy() {
  const s = useStore()
  const groups = [...new Set(s.findings.map((f) => f.checkId))].map((c) => {
    const fs = s.findings.filter((f) => f.checkId === c)
    const dec = fs.filter((f) => f.decision && f.status !== 'RESOLVED')
    const upheld = dec.filter((f) => f.status === 'ACCEPTED' || f.status === 'ESCALATED' || f.status === 'NEEDS_EVIDENCE').length
    return { c, total: fs.length, decided: dec.length, upheld, dismissed: dec.filter((f) => f.status === 'DISMISSED').length, rate: dec.length ? (upheld / dec.length) * 100 : 0 }
  }).sort((a, b) => b.total - a.total)
  return (
    <>
      <PageHeader title="Check accuracy" sub="How often officers upheld each check’s findings versus dismissed them." />
      <Callout tone="amber">Derived from officer decisions in this browser’s demo store — a handful of samples, <SimTag>not a statistical accuracy measurement</SimTag>.</Callout>
      <Card className="mt-4 divide-y divide-line">
        {groups.map((g) => (
          <div key={g.c} className="grid items-center gap-3 p-3 sm:grid-cols-[14rem_1fr_12rem]">
            <div><div className="font-mono text-sm">{g.c}</div><div className="text-xs text-muted">{g.total} finding(s) · {g.decided} decided</div></div>
            <Progress value={g.rate} tone={g.rate > 66 ? 'green' : g.rate > 33 ? 'amber' : 'red'} />
            <div className="text-xs text-muted">{g.decided ? `${g.upheld} upheld · ${g.dismissed} dismissed (${Math.round(g.rate)}% upheld)` : 'No decisions yet'}</div>
          </div>))}
      </Card>
    </>
  )
}
