import type { DemoState } from '../types'
import { APP_STATUS_LABEL, APP_TYPE_LABEL, CHECK_LABEL, fmtDate, fmtDateTime } from './format'
import { DEFAULT_INFRA, infraChecks, recordChecks } from './records'
import { explain } from './xai'

const esc = (x: unknown) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

export function buildReportHtml(s: DemoState, appId: string): string {
  const app = s.apps.find((a) => a.id === appId)!
  const inst = s.institutions.find((i) => i.id === app.instId)!
  const docs = s.docs.filter((d) => d.appId === appId)
  const fs = s.findings.filter((f) => f.appId === appId)
  const recs = recordChecks(s, app)
  const infra = infraChecks(s, app, DEFAULT_INFRA)
  const rs = s.rulesets.find((r) => r.status === 'ACTIVE')
  const audit = s.audit.filter((a) => a.target === appId)
  const x = explain(s, app)
  const row = (c: string[]) => `<tr>${c.map((x) => `<td>${x}</td>`).join('')}</tr>`
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>Validation report ${esc(appId)}</title>
<style>body{font:14px/1.5 system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1c263a}h1{margin-bottom:0}h2{margin-top:2rem;border-bottom:1px solid #ccd;padding-bottom:.2rem}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd;padding:.35rem .5rem;text-align:left;vertical-align:top;font-size:13px}th{background:#eef}.note{background:#fff4e0;border:1px solid #e0b060;padding:.6rem .8rem;border-radius:6px}.sim{color:#a05000;font-size:11px;font-weight:700}</style>
<h1>PRAMAAN validation report</h1>
<p><b>${esc(appId)}</b> · ${esc(APP_TYPE_LABEL[app.type])} · ${esc(inst.name)} (${esc(inst.id)}) · Session ${esc(app.session)}<br>Status: ${esc(APP_STATUS_LABEL[app.status])} · Ruleset ${esc(rs?.version)} · Generated ${esc(fmtDateTime(new Date().toISOString()))}</p>
<p class="note"><b>Decision-support output — not an official AICTE document.</b> Findings are preliminary indicators for review by authorized officials.</p>
<h2>Explainable AI summary — suggested outcome: ${x.outcome}</h2><p><b>${esc(x.headline)}</b> (compliance score ${x.score}/100)</p><p>${esc(x.paragraph)}</p>${x.against.length ? `<h3>${x.outcome === 'REJECT' ? 'Why it is rejected' : 'Points still open'}</h3><ol>${x.against.map((p) => `<li><b>${esc(p.title)}</b>${p.ref ? ` (${esc(p.ref)})` : ''} — ${esc(p.detail)}${p.action ? `<br><i>To fix: ${esc(p.action)}</i>` : ''}</li>`).join('')}</ol>` : ''}${x.supports.length ? `<h3>${x.outcome === 'ACCEPT' ? 'Why it is accepted' : 'What passed'}</h3><ul>${x.supports.map((p) => `<li><b>${esc(p.title)}</b> — ${esc(p.detail)}</li>`).join('')}</ul>` : ''}${x.errors.length ? `<h3>Error summary</h3><ul>${x.errors.map((g) => `<li><b>${esc(g.category)}</b> (${g.count}): ${esc(g.items.join('; '))}</li>`).join('')}</ul>` : ''}<h3>UN SDG alignment</h3><ul>${x.sdg.map((g) => `<li><b>SDG ${g.goal} — ${esc(g.name)}</b> (targets ${g.targets.map((t) => t.id).join(', ')}): ${esc(g.why)}</li>`).join('')}</ul>
<h2>Documents</h2><table><tr><th>Document</th><th>File</th><th>Ver.</th><th>Status</th><th>SHA-256</th></tr>${docs.map((d) => row([esc(d.name), esc(d.fileName), 'v' + d.version, esc(CHECK_LABEL[d.status]), `<code>${d.fingerprint.slice(0, 16)}…</code>`])).join('')}</table>
<h2>Findings (${fs.length})</h2>${fs.length ? fs.map((f) => `<h3>${esc(f.id)} · ${esc(f.title)} <small>[${f.severity} · ${esc(CHECK_LABEL[f.verdict])} · ${esc(f.status)}]</small></h3><p>${esc(f.description)}</p><ul>${f.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul><p><b>Rule:</b> ${esc(f.rule)} · <b>Source:</b> ${esc(f.source)}${f.simulated ? '' : ''} · <b>Confidence:</b> ${f.confidence !== undefined ? Math.round(f.confidence * 100) + '%' : 'n/a'}<br><b>Suggested action:</b> ${esc(f.action)}${f.decision ? `<br><b>Officer decision:</b> ${esc(f.decision.action)} by ${esc(f.decision.by)} (${esc(fmtDate(f.decision.at))})${f.decision.reason ? ' — ' + esc(f.decision.reason) : ''}` : ''}</p>`).join('') : '<p>No findings generated yet.</p>'}
<h2>Cross-check with AICTE records</h2><table><tr><th>Item</th><th>Application</th><th>Record</th><th>Status</th><th>Note</th></tr>${recs.map((r) => row([esc(r.label), esc(r.application), esc(r.record), esc(CHECK_LABEL[r.status]), esc(r.note)])).join('')}</table>
<h2>Infrastructure compliance (advisory)</h2><table><tr><th>Item</th><th>Declared</th><th>Required</th><th>Status</th><th>Note</th></tr>${infra.rows.map((r) => row([esc(r.label), esc(r.declared), esc(r.required), esc(CHECK_LABEL[r.status]), esc(r.note)])).join('')}</table>
<p><b>Physical inspection:</b> ${infra.inspect ? 'recommended for officer consideration — ' + esc(infra.reasons.join('; ')) : 'not indicated by the checks above'}. The decision remains with the competent authority.</p>
<h2>Audit trail</h2><table><tr><th>#</th><th>Time</th><th>Actor</th><th>Action</th><th>Detail</th></tr>${audit.map((a) => row([String(a.id), esc(fmtDateTime(a.at)), esc(a.actor), esc(a.action), esc(a.detail)])).join('')}</table>
<p class="note">AI suggests. The authorized officer decides.</p></html>`
}

export function downloadReport(s: DemoState, appId: string) {
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([buildReportHtml(s, appId)], { type: 'text/html' }))
  a.download = `validation-report-${appId}.html`
  a.click()
  URL.revokeObjectURL(a.href)
}
