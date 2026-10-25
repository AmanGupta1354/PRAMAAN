import type { AppType, Requirement } from '../types'

const PDF_IMG = ['PDF', 'JPG', 'PNG']
const PDF = ['PDF']

export const DEFAULT_CHECKLISTS: Record<AppType, Requirement[]> = {
  NEW: [
    { key: 'TRUST', name: 'Trust / Society registration certificate', mandatory: true, formats: PDF, clause: 'Handbook §3.1' },
    { key: 'FIRE', name: 'Fire safety certificate', mandatory: true, formats: PDF_IMG, clause: 'Handbook §4.3.2' },
    { key: 'LAND', name: 'Land ownership / lease deed', mandatory: true, formats: PDF, clause: 'Handbook §3.4' },
    { key: 'BLDG', name: 'Sanctioned building plan', mandatory: true, formats: PDF, clause: 'Handbook §5.2' },
    { key: 'FAC', name: 'Faculty list with qualifications', mandatory: true, formats: PDF, clause: 'Handbook §6.1' },
    { key: 'FIN', name: 'Audited financial statement / FD proof', mandatory: true, formats: PDF, clause: 'Handbook §7.1' },
    { key: 'PHOTO', name: 'Campus photographs', mandatory: false, formats: ['JPG', 'PNG'], clause: 'Handbook §9.3' },
    { key: 'INV', name: 'Laboratory equipment invoices', mandatory: false, formats: PDF_IMG, clause: 'Handbook §7.4' },
  ],
  EXT: [
    { key: 'PREV', name: 'Previous approval letter', mandatory: true, formats: PDF, clause: 'Handbook §2.2' },
    { key: 'FIRE', name: 'Fire safety certificate', mandatory: true, formats: PDF_IMG, clause: 'Handbook §4.3.2' },
    { key: 'FAC', name: 'Faculty list with qualifications', mandatory: true, formats: PDF, clause: 'Handbook §6.1' },
    { key: 'BLDG', name: 'Building completion certificate', mandatory: true, formats: PDF, clause: 'Handbook §5.2' },
    { key: 'FIN', name: 'Audited balance sheet (last 3 years)', mandatory: true, formats: PDF, clause: 'Handbook §7.1' },
    { key: 'INV', name: 'Laboratory equipment invoices', mandatory: true, formats: PDF_IMG, clause: 'Handbook §7.4' },
    { key: 'PHOTO', name: 'Campus photographs', mandatory: false, formats: ['JPG', 'PNG'], clause: 'Handbook §9.3' },
    { key: 'NAAC', name: 'NAAC / NBA accreditation letter', mandatory: false, formats: PDF, clause: 'Handbook §8.5' },
  ],
  INTAKE: [
    { key: 'PREV', name: 'Existing approval letter', mandatory: true, formats: PDF, clause: 'Handbook §2.2' },
    { key: 'FIRE', name: 'Fire safety certificate', mandatory: true, formats: PDF_IMG, clause: 'Handbook §4.3.2' },
    { key: 'FAC', name: 'Faculty additions with qualifications', mandatory: true, formats: PDF, clause: 'Handbook §6.1' },
    { key: 'INFRA', name: 'Additional infrastructure plan', mandatory: true, formats: PDF, clause: 'Handbook §5.4' },
    { key: 'INV', name: 'Laboratory equipment invoices', mandatory: true, formats: PDF_IMG, clause: 'Handbook §7.4' },
    { key: 'FIN', name: 'Financial capacity statement', mandatory: true, formats: PDF, clause: 'Handbook §7.1' },
    { key: 'PHOTO', name: 'Campus photographs', mandatory: false, formats: ['JPG', 'PNG'], clause: 'Handbook §9.3' },
  ],
}

export const APP_TYPES: { key: AppType; name: string; blurb: string }[] = [
  { key: 'NEW', name: 'New Institution', blurb: 'First-time approval for a proposed technical institution.' },
  { key: 'EXT', name: 'Extension of Approval', blurb: 'Annual continuation of approval for an existing institution.' },
  { key: 'INTAKE', name: 'Increase in Intake', blurb: 'Request to increase sanctioned seats in existing programmes.' },
]

export const EXT_FORMATS: Record<string, string[]> = {
  PDF: ['application/pdf'],
  JPG: ['image/jpeg'],
  PNG: ['image/png'],
}
export const MAX_FILE_BYTES = 10 * 1024 * 1024
