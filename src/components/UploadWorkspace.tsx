import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, FileUp, Trash2, UploadCloud, Replace, FlaskConical } from 'lucide-react'
import type { Application, DocRecord } from '../types'
import { actions, useStore } from '../lib/store'
import { analyzeFile, demoSample, setPreview, validateFile } from '../lib/fileInfo'
import { fmtSize } from '../lib/format'
import { Badge, Button, Callout, CheckBadge, cn, Progress, SimTag, useToast } from './ui'
import { DocPreview } from './DocPreview'
import { MAX_FILE_BYTES } from '../data/catalog'

export function UploadWorkspace({ app, editable }: { app: Application; editable: boolean }) {
  const s = useStore()
  const toast = useToast()
  const reqs = s.checklists[app.type]
  const docs = s.docs.filter((d) => d.appId === app.id)
  const [category, setCategory] = useState(reqs[0]?.key ?? '')
  const [drag, setDrag] = useState(false)
  const [busy, setBusy] = useState<{ key: string; name: string; pct: number } | null>(null)
  const [warn, setWarn] = useState<Record<string, string[]>>({})
  const [preview, setPrev] = useState<DocRecord | null>(null)
  const pickRef = useRef<HTMLInputElement>(null)
  const pickKey = useRef('')

  const handle = async (file: File, key: string) => {
    const req = reqs.find((r) => r.key === key)!
    const err = validateFile(file, req.formats)
    if (err) { toast('bad', `${file.name}: ${err}`); return }
    setBusy({ key, name: file.name, pct: 10 })
    try {
      const tick = setInterval(() => setBusy((b) => (b && b.pct < 85 ? { ...b, pct: b.pct + 15 } : b)), 90)
      const { meta, warnings, previewUrl } = await analyzeFile(file)
      clearInterval(tick)
      setBusy((b) => b && { ...b, pct: 100 })
      const r = actions.addDoc(app.id, key, meta)
      if (!r.ok) { toast('bad', r.error); return }
      setPreview(r.data, previewUrl)
      setWarn((w) => ({ ...w, [key]: warnings }))
      toast('ok', `${file.name} added.`)
    } catch (e) {
      toast('bad', e instanceof Error ? e.message : 'Could not read the file.')
    } finally {
      setTimeout(() => setBusy(null), 450)
    }
  }
  const sample = (key: string) => {
    const existing = docs.find((d) => d.reqKey === key)
    const r = actions.addDoc(app.id, key, demoSample(key, (existing?.version ?? 0) + 1, reqs.find((r) => r.key === key)?.formats))
    toast(r.ok ? 'ok' : 'bad', r.ok ? 'Labelled demo sample attached.' : r.error)
  }
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDrag(false)
    const f = e.dataTransfer.files[0]; if (f && editable) void handle(f, category)
  }
  const missing = reqs.filter((r) => r.mandatory && !docs.some((d) => d.reqKey === r.key))

  return (
    <div className="space-y-4">
      
      {editable && (
        <div onDragOver={(e) => { e.preventDefault(); setDrag(true) }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
          className={cn('rounded-2xl border-2 border-dashed p-6 text-center transition', drag ? 'border-accent bg-accent/10' : 'border-line bg-surface')}>
          <UploadCloud className="mx-auto h-8 w-8 text-accent" />
          <p className="mt-2 text-sm font-semibold">Drag and drop a document here</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
            <label className="flex items-center gap-2 text-muted">Category
              <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-xl border border-line bg-bg px-2 py-1.5 text-fg">
                {reqs.map((r) => <option key={r.key} value={r.key}>{r.name}</option>)}
              </select>
            </label>
            <Button onClick={() => { pickKey.current = category; pickRef.current?.click() }}><FileUp className="h-4 w-4" /> Choose file</Button>
            <Button onClick={() => sample(category)}><FlaskConical className="h-4 w-4" /> Use demo sample</Button>
          </div>
          {busy && <div className="mx-auto mt-4 max-w-sm text-left text-xs"><div className="mb-1 flex justify-between"><span className="truncate">{busy.name}</span><span>{busy.pct}%</span></div><Progress value={busy.pct} /></div>}
        </div>
      )}
      <input ref={pickRef} type="file" hidden accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handle(f, pickKey.current) }} />

      {missing.length > 0 && editable && <Callout tone="amber" title={`${missing.length} mandatory document(s) missing`}>{missing.map((m) => m.name).join(' · ')}</Callout>}

      <ul className="space-y-2">
        {reqs.map((r) => {
          const d = docs.find((x) => x.reqKey === r.key)
          return (
            <motion.li layout key={r.key} className="rounded-2xl border border-line bg-surface p-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full', d ? 'bg-ok/15 text-ok' : 'bg-raised text-muted')}>{d ? <CheckCircle2 className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-semibold">{r.name}<Badge tone={r.mandatory ? 'red' : 'gray'}>{r.mandatory ? 'Mandatory' : 'Optional'}</Badge><span className="text-xs font-normal text-muted">{r.clause} · {r.formats.join(', ')}</span></div>
                  {d ? (
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                      <span className="truncate">{d.fileName} · {fmtSize(d.size)}{d.pages ? ` · ${d.pages}p` : ''} · v{d.version}</span>
                      {d.source !== 'SEED_SAMPLE' && <SimTag>{d.source === 'BROWSER_UPLOAD' ? 'Browser-local' : 'Demo sample'}</SimTag>}
                      <CheckBadge s={d.status} />
                    </div>
                  ) : <div className="mt-0.5 text-xs text-muted">Not uploaded</div>}
                  {warn[r.key]?.map((w) => <div key={w} className="mt-1 text-xs text-warn">⚠ {w}</div>)}
                </div>
                {editable && (
                  <div className="flex flex-wrap gap-1.5">
                    <Button size="sm" onClick={() => { pickKey.current = r.key; pickRef.current?.click() }}>{d ? <><Replace className="h-3.5 w-3.5" /> Replace</> : <><FileUp className="h-3.5 w-3.5" /> Upload</>}</Button>
                    <Button size="sm" onClick={() => sample(r.key)} title="Attach a sample document"><FlaskConical className="h-3.5 w-3.5" /> Sample</Button>
                    {d && app.status === 'DRAFT' && <Button size="sm" variant="danger" aria-label={`Remove ${d.fileName}`} onClick={() => { const x = actions.removeDoc(d.id); toast(x.ok ? 'info' : 'bad', x.ok ? 'Document removed.' : x.error) }}><Trash2 className="h-3.5 w-3.5" /></Button>}
                    {d && <Button size="sm" variant="ghost" onClick={() => setPrev(d)}>Preview</Button>}
                  </div>
                )}
                {!editable && d && <Button size="sm" variant="ghost" onClick={() => setPrev(d)}>Preview</Button>}
              </div>
            </motion.li>
          )
        })}
      </ul>
      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setPrev(null)}>
          <div className="w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <DocPreview doc={preview} />
            <Button className="mt-2 w-full" onClick={() => setPrev(null)}>Close preview</Button>
            {!preview.mime.includes('pdf') && !preview.mime.includes('image') && <p className="mt-2 text-xs text-white">No preview available.</p>}
          </div>
        </div>
      )}
    </div>
  )
}
