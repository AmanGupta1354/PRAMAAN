import { useState } from 'react'
import { Play } from 'lucide-react'
import { deepAnalyze, type DeepAnalysis } from '../../lib/deepAnalyze'
import { Badge, Button, Callout, Card, PageHeader, Progress, Td, Th } from '../../components/ui'

interface Truth { expiry?: string; certNo?: string; area?: string; faculty?: string; hiddenText: boolean; incrementalUpdate: boolean }
interface Item { file: string; label: string; truth: Truth }
interface Row { item: Item; ms: number; a: DeepAnalysis; checks: { name: string; expected: string; got: string; ok: boolean }[] }

const val = (a: DeepAnalysis, f: string) => a.fields.find((x) => x.field === f)?.value
const digits = (s?: string) => (s ?? '').replace(/[^\d]/g, '')

function score(item: Item, a: DeepAnalysis, ms: number): Row {
  const t = item.truth, checks: Row['checks'] = []
  const add = (name: string, expected: string, got: string, ok: boolean) => checks.push({ name, expected, got: got || '—', ok })
  if (t.expiry) add('Expiry date', t.expiry, a.expiresOn?.slice(0, 10) ?? '', a.expiresOn?.slice(0, 10) === t.expiry)
  if (t.certNo) add('Reference number', t.certNo, val(a, 'Certificate number') ?? '', (val(a, 'Certificate number') ?? '').toUpperCase() === t.certNo)
  if (t.area) add('Built-up area', t.area, val(a, 'Declared built-up area') ?? '', digits(val(a, 'Declared built-up area')) === digits(t.area))
  if (t.faculty) add('Faculty count', t.faculty, val(a, 'Faculty count') ?? '', val(a, 'Faculty count') === t.faculty)
  const hid = (a.pdf?.hiddenItems ?? 0) > 0, inc = (a.pdf?.eofCount ?? 0) > 1
  add('Hidden-text flag', String(t.hiddenText), String(hid), hid === t.hiddenText)
  add('Edited-after-issue flag', String(t.incrementalUpdate), String(inc), inc === t.incrementalUpdate)
  return { item, ms, a, checks }
}

export default function Evaluation() {
  const [rows, setRows] = useState<Row[]>([])
  const [running, setRunning] = useState(false)
  const [status, setStatus] = useState('')
  const [pct, setPct] = useState(0)

  const run = async () => {
    setRunning(true); setRows([]); setPct(0)
    try {
      const manifest = await (await fetch('/samples/manifest.json')).json() as Item[]
      const out: Row[] = []
      for (let i = 0; i < manifest.length; i++) {
        const it = manifest[i]
        setStatus(`Analysing ${it.file}…`)
        const blob = await (await fetch(`/samples/${it.file}`)).blob()
        const file = new File([blob], it.file, { type: it.file.endsWith('.pdf') ? 'application/pdf' : 'image/png' })
        const t0 = performance.now()
        const a = await deepAnalyze(file, (s) => setStatus(`${it.file}: ${s}`))
        out.push(score(it, a, Math.round(performance.now() - t0)))
        setRows([...out]); setPct(((i + 1) / manifest.length) * 100)
      }
      setStatus('Done')
    } catch (e) { setStatus(`Evaluation failed: ${e instanceof Error ? e.message : 'unknown error'}`) }
    setRunning(false)
  }

  const all = rows.flatMap((r) => r.checks)
  const group = (names: string[]) => { const c = all.filter((x) => names.includes(x.name)); return { n: c.length, ok: c.filter((x) => x.ok).length } }
  const fields = group(['Expiry date', 'Reference number', 'Built-up area', 'Faculty count'])
  const pr = (flag: string, key: 'hiddenText' | 'incrementalUpdate') => {
    let tp = 0, fp = 0, fn = 0
    rows.forEach((r) => { const c = r.checks.find((x) => x.name === flag)!; const pred = c.got === 'true', truth = r.item.truth[key]; if (pred && truth) tp++; else if (pred && !truth) fp++; else if (!pred && truth) fn++ })
    return { tp, fp, fn, p: tp + fp ? tp / (tp + fp) : 1, r: tp + fn ? tp / (tp + fn) : 1 }
  }
  const hid = pr('Hidden-text flag', 'hiddenText'), inc = pr('Edited-after-issue flag', 'incrementalUpdate')
  const avg = rows.length ? Math.round(rows.reduce((n, r) => n + r.ms, 0) / rows.length) : 0
  const pctf = (x: number) => `${Math.round(x * 100)}%`
  const tile = (label: string, value: string, hint: string) => <Card className="p-4"><div className="text-xs font-medium uppercase tracking-wide text-muted">{label}</div><div className="mt-1 text-3xl font-bold tabular-nums">{value}</div><div className="mt-1 text-xs text-muted">{hint}</div></Card>

  return (
    <>
      <PageHeader title="Evaluation" sub="Runs the real in-browser analysis (pdf.js + Tesseract.js) over labelled sample documents and compares the output with ground truth."
        actions={<Button variant="primary" onClick={run} disabled={running}><Play className="h-4 w-4" /> {running ? 'Running…' : 'Run evaluation'}</Button>} />
      <Callout tone="blue" title="How to read this">Seven labelled documents (six PDFs and one scanned image) are in <b>/samples</b> with their ground truth in <b>manifest.json</b>. The first run downloads and starts the OCR engine, so the scanned image can take several seconds. This is a small test set — it demonstrates the measurement method, not production accuracy.</Callout>
      {(running || rows.length > 0) && <div className="mt-4"><Progress value={pct} /><div className="mt-1 text-xs text-muted">{status}</div></div>}
      {rows.length > 0 && (
        <>
          <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {tile('Field extraction accuracy', fields.n ? pctf(fields.ok / fields.n) : '—', `${fields.ok}/${fields.n} fields exactly correct`)}
            {tile('Hidden-text detection', `P ${pctf(hid.p)} · R ${pctf(hid.r)}`, `TP ${hid.tp} · FP ${hid.fp} · FN ${hid.fn}`)}
            {tile('Edit detection', `P ${pctf(inc.p)} · R ${pctf(inc.r)}`, `TP ${inc.tp} · FP ${inc.fp} · FN ${inc.fn}`)}
            {tile('Avg analysis time', `${avg} ms`, 'per document, in this browser')}
          </div>
          <Card className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line"><tr><Th>Document</Th><Th>Check</Th><Th>Expected</Th><Th>Got</Th><Th>Result</Th><Th>Time</Th></tr></thead>
              <tbody className="divide-y divide-line">
                {rows.flatMap((r) => r.checks.map((c, i) => (
                  <tr key={r.item.file + c.name}>
                    <Td className="text-xs">{i === 0 ? <><b>{r.item.label}</b><div className="font-mono text-[11px] text-muted">{r.item.file}{r.a.ocr?.used && ` · OCR ${Math.round((r.a.ocr.confidence ?? 0) * 100)}%`}</div></> : ''}</Td>
                    <Td>{c.name}</Td><Td className="font-mono text-xs">{c.expected}</Td><Td className="font-mono text-xs">{c.got}</Td>
                    <Td><Badge tone={c.ok ? 'green' : 'red'}>{c.ok ? 'Correct' : 'Wrong'}</Badge></Td><Td className="text-xs text-muted">{i === 0 ? `${r.ms} ms` : ''}</Td>
                  </tr>
                )))}
              </tbody>
            </table>
          </Card>
        </>
      )}
    </>
  )
}
