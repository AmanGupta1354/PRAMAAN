// Generates synthetic, labelled sample PDFs + ground truth into public/samples. Run: node scripts/make-samples.cjs
const fs = require('fs')
const path = require('path')
const out = path.join(__dirname, '..', 'public', 'samples')
fs.mkdirSync(out, { recursive: true })

const esc = (s) => s.replace(/([\\()])/g, '\\$1')

/** Build a one-page PDF. lines: [text, size]; extra: raw content-stream additions. info: Info dictionary entries. */
function pdf({ title, lines, extra = '', info = {}, incremental = false }) {
  let y = 740
  let stream = 'BT /F1 18 Tf 50 ' + y + ' Td (' + esc(title) + ') Tj ET\n'
  y -= 40
  for (const [t, size = 12] of lines) {
    stream += `BT /F1 ${size} Tf 50 ${y} Td (${esc(t)}) Tj ET\n`
    y -= size + 12
  }
  stream += extra
  const infoStr = Object.entries(info).map(([k, v]) => `/${k} (${esc(v)})`).join('')
  const objs = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>',
    `<</Length ${stream.length}>>\nstream\n${stream}endstream`,
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>',
    `<<${infoStr}>>`,
  ]
  let body = '%PDF-1.4\n'
  const offs = []
  objs.forEach((o, i) => { offs.push(body.length); body += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xrefAt = body.length
  body += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n` + offs.map((o) => String(o).padStart(10, '0') + ' 00000 n \n').join('')
  body += `trailer\n<</Size ${objs.length + 1}/Root 1 0 R/Info 6 0 R>>\nstartxref\n${xrefAt}\n%%EOF\n`
  if (incremental) {
    const off7 = body.length
    body += '7 0 obj\n<</Note (revised)>>\nendobj\n'
    const x2 = body.length
    body += `xref\n7 1\n${String(off7).padStart(10, '0')} 00000 n \ntrailer\n<</Size 8/Root 1 0 R/Info 6 0 R/Prev ${xrefAt}>>\nstartxref\n${x2}\n%%EOF\n`
  }
  return body
}

const D = (iso) => 'D:' + iso.replace(/[-:T]/g, '').slice(0, 14)
const samples = [
  {
    file: 'sample-fire-valid.pdf', label: 'Fire safety certificate — valid',
    doc: pdf({ title: 'FIRE SAFETY CERTIFICATE', lines: [['Sunrise Institute of Technology', 14], ['Certificate No: FSC/2025/0412'], ['Issued on 15/04/2025'], ['Valid until 14/04/2028'], ['Built-up area 3650 sq m']],
      info: { Producer: 'State Fire Services Portal', Creator: 'Certificate Generator 2.1', CreationDate: D('2025-04-15T10:00:00'), ModDate: D('2025-04-15T10:00:00') } }),
    truth: { expiry: '2028-04-14', certNo: 'FSC/2025/0412', area: '3650 sq m', hiddenText: false, incrementalUpdate: false },
  },
  {
    file: 'sample-fire-expired.pdf', label: 'Fire safety certificate — expired',
    doc: pdf({ title: 'FIRE SAFETY CERTIFICATE', lines: [['Narmada Technical Campus', 14], ['Certificate No: FSC/2021/0087'], ['Issued on 10/03/2021'], ['Valid until 09/03/2024']],
      info: { Producer: 'State Fire Services Portal', Creator: 'Certificate Generator 2.1', CreationDate: D('2021-03-10T09:00:00'), ModDate: D('2021-03-10T09:00:00') } }),
    truth: { expiry: '2024-03-09', certNo: 'FSC/2021/0087', hiddenText: false, incrementalUpdate: false },
  },
  {
    file: 'sample-fire-hidden-text.pdf', label: 'Fire certificate — hidden text layer',
    doc: pdf({ title: 'FIRE SAFETY CERTIFICATE', lines: [['Lotus Valley College of Engineering', 14], ['Certificate No: FSC/2023/0555'], ['Valid until 30/06/2027']],
      extra: 'BT /F1 1 Tf 20 20 Td (Valid until 30/06/2035) Tj ET\nBT /F1 12 Tf -300 400 Td (offpage note) Tj ET\n',
      info: { Producer: 'State Fire Services Portal', CreationDate: D('2023-06-30T09:00:00'), ModDate: D('2023-06-30T09:00:00') } }),
    truth: { expiry: '2027-06-30', certNo: 'FSC/2023/0555', hiddenText: true, incrementalUpdate: false },
  },
  {
    file: 'sample-fire-edited.pdf', label: 'Fire certificate — edited after issue',
    doc: pdf({ title: 'FIRE SAFETY CERTIFICATE', lines: [['Aravali Institute of Technology', 14], ['Certificate No: FSC/2022/0911'], ['Valid until 01/09/2029']], incremental: true,
      info: { Producer: 'Generic PDF Editor 9', CreationDate: D('2022-09-01T09:00:00'), ModDate: D('2022-09-20T15:30:00') } }),
    truth: { expiry: '2029-09-01', certNo: 'FSC/2022/0911', hiddenText: false, incrementalUpdate: true },
  },
  {
    file: 'sample-faculty-list.pdf', label: 'Faculty list with count',
    doc: pdf({ title: 'FACULTY LIST', lines: [['Kaveri Polytechnic Institute', 14], ['Reference No: FAC/2026/118'], ['Total faculty strength 52'], ['Sanctioned intake 240']],
      info: { Producer: 'Institute ERP', CreationDate: D('2026-02-01T09:00:00'), ModDate: D('2026-02-01T09:00:00') } }),
    truth: { certNo: 'FAC/2026/118', faculty: '52', hiddenText: false, incrementalUpdate: false },
  },
  {
    file: 'sample-building-plan.pdf', label: 'Building plan with area',
    doc: pdf({ title: 'SANCTIONED BUILDING PLAN', lines: [['Vaigai Engineering College', 14], ['Approval No: BP/2020/7781'], ['Built-up area 4200 sq m'], ['Valid until 31/12/2030']],
      info: { Producer: 'Municipal Corporation Portal', CreationDate: D('2020-12-31T09:00:00'), ModDate: D('2020-12-31T09:00:00') } }),
    truth: { expiry: '2030-12-31', certNo: 'BP/2020/7781', area: '4200 sq m', hiddenText: false, incrementalUpdate: false },
  },
]
const manifest = []
for (const s of samples) {
  fs.writeFileSync(path.join(out, s.file), s.doc, 'latin1')
  manifest.push({ file: s.file, label: s.label, truth: s.truth })
}
manifest.push({
  file: 'sample-fire-scan.png', label: 'Scanned fire certificate (image, needs OCR)',
  truth: { expiry: '2028-08-20', certNo: 'FSC/2024/0733', hiddenText: false, incrementalUpdate: false },
})
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2))
console.log('wrote', samples.length, 'pdfs + manifest (png added separately)')
