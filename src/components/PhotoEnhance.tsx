import { useRef, useState } from 'react'
import { Download, FlaskConical, ImageUp, Wand2 } from 'lucide-react'
import { enhanceImage, syntheticLabPhoto, type EnhanceResult } from '../lib/enhance'
import { Button, Callout, Card, cn, Progress, useToast } from './ui'

const Delta = ({ label, a, b, better }: { label: string; a: number; b: number; better: (a: number, b: number) => boolean }) => (
  <div className="rounded-xl bg-raised p-2.5 text-center">
    <div className="text-[11px] uppercase tracking-wide text-muted">{label}</div>
    <div className="mt-0.5 text-sm"><span className="text-muted">{a}</span> → <b className={cn(better(a, b) ? 'text-ok' : '')}>{b}</b></div>
  </div>
)

/** Enhance lab / classroom evidence photos in the browser: auto-contrast, brightness, sharpening, upscaling. */
export function PhotoEnhance() {
  const toast = useToast()
  const pick = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState<EnhanceResult | null>(null)
  const [name, setName] = useState('')
  const [split, setSplit] = useState(50)

  const run = async (src: Blob | string, label: string) => {
    setBusy(true); setName(label)
    try { setRes(await enhanceImage(src)) } catch (e) { toast('bad', e instanceof Error ? e.message : 'Enhancement failed'); setRes(null) }
    setBusy(false)
  }
  const download = () => { if (!res) return; const a = document.createElement('a'); a.href = res.after; a.download = `enhanced-${name.replace(/\.[^.]+$/, '')}.jpg`; a.click() }

  return (
    <div className="space-y-3">
      <Callout tone="blue" title="Lab and classroom photo enhancement">Dim, soft or low-resolution evidence photos are corrected in your browser (auto-contrast, brightness, sharpening, upscaling) so officers can read equipment and labels. The photo never leaves your device, and the original is kept alongside the enhanced copy.</Callout>
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => pick.current?.click()} disabled={busy}><ImageUp className="h-4 w-4" /> Choose photo</Button>
          <Button onClick={() => run(syntheticLabPhoto(), 'sample-lab.jpg')} disabled={busy}><FlaskConical className="h-4 w-4" /> Try a dim sample lab photo</Button>
          {res && <Button onClick={download}><Download className="h-4 w-4" /> Download enhanced</Button>}
          <input ref={pick} type="file" accept="image/jpeg,image/png" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void run(f, f.name) }} />
        </div>
        {busy && <div className="mt-3"><Progress value={70} /><div className="mt-1 text-xs text-muted">Enhancing…</div></div>}
        {res && (
          <div className="mt-4 space-y-3">
            <div className="relative mx-auto max-w-2xl select-none overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: `${res.mBefore.width} / ${res.mBefore.height}` }}>
              <img src={res.after} alt="Enhanced photo" className="absolute inset-0 h-full w-full object-contain" />
              <div className="absolute inset-0 overflow-hidden" style={{ width: `${split}%` }}>
                <img src={res.before} alt="Original photo" className="absolute inset-0 h-full object-contain" style={{ width: `${100 / (split / 100)}%`, maxWidth: 'none' }} />
              </div>
              <div className="absolute inset-y-0 w-0.5 bg-white shadow" style={{ left: `${split}%` }} />
              <span className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">Original</span>
              <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[11px] text-white">Enhanced</span>
            </div>
            <label className="mx-auto block max-w-2xl text-xs text-muted">Drag to compare
              <input type="range" min={0} max={100} value={split} onChange={(e) => setSplit(+e.target.value)} className="mt-1 w-full" aria-label="Compare original and enhanced" />
            </label>
            <div className="grid max-w-2xl grid-cols-2 gap-2 sm:mx-auto sm:grid-cols-4">
              <Delta label="Brightness" a={res.mBefore.brightness} b={res.mAfter.brightness} better={(a, b) => Math.abs(b - 128) < Math.abs(a - 128)} />
              <Delta label="Contrast" a={res.mBefore.contrast} b={res.mAfter.contrast} better={(a, b) => b > a} />
              <Delta label="Sharpness" a={res.mBefore.sharpness} b={res.mAfter.sharpness} better={(a, b) => b > a} />
              <div className="rounded-xl bg-raised p-2.5 text-center"><div className="text-[11px] uppercase tracking-wide text-muted">Size</div><div className="mt-0.5 text-sm"><span className="text-muted">{res.mBefore.width}×{res.mBefore.height}</span> → <b>{res.mAfter.width}×{res.mAfter.height}</b></div></div>
            </div>
            <ul className="mx-auto max-w-2xl list-disc space-y-0.5 pl-5 text-xs text-muted">{res.steps.map((st) => <li key={st}>{st}</li>)}</ul>
            <p className="mx-auto max-w-2xl text-xs text-muted"><Wand2 className="mr-1 inline h-3 w-3" />Enhancement improves legibility only. It does not add or remove objects, and officers still review the original.</p>
          </div>
        )}
      </Card>
    </div>
  )
}
