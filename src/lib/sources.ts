// A real, public, CORS-enabled lookup that works from a static site: the India Post PIN directory.
import type { Institution } from '../types'

export const PIN_BY_CITY: Record<string, string> = {
  Pune: '411001', Indore: '452001', Mysuru: '570001', Dehradun: '248001', Bhopal: '462001', Bhubaneswar: '751001',
  Lucknow: '226001', Kochi: '682001', Madurai: '625001', Jaipur: '302001', Guwahati: '781001', Hyderabad: '500001',
}

export interface PinResult { ok: boolean; unavailable?: boolean; pin: string; districts: string[]; state?: string; match?: boolean; detail: string }

export async function lookupPin(inst: Institution, signal?: AbortSignal): Promise<PinResult> {
  const pin = PIN_BY_CITY[inst.city]
  if (!pin) return { ok: false, unavailable: true, pin: '', districts: [], detail: 'No PIN on file for this institution' }
  try {
    const ctl = new AbortController()
    const t = setTimeout(() => ctl.abort(), 8000)
    signal?.addEventListener('abort', () => ctl.abort())
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctl.signal })
    clearTimeout(t)
    const j = await res.json() as { Status: string; PostOffice?: { District: string; State: string }[] }[]
    const offices = j[0]?.PostOffice ?? []
    if (j[0]?.Status !== 'Success' || !offices.length) return { ok: true, pin, districts: [], match: false, detail: `PIN ${pin} not found in the India Post directory` }
    const districts = [...new Set(offices.map((o) => o.District))]
    const state = offices[0].State
    const match = districts.some((d) => d.toLowerCase().includes(inst.city.toLowerCase()) || inst.city.toLowerCase().includes(d.toLowerCase())) && state.toLowerCase() === inst.state.toLowerCase()
    return { ok: true, pin, districts, state, match, detail: `PIN ${pin} → ${districts.join(', ')}, ${state}` }
  } catch {
    return { ok: false, unavailable: true, pin, districts: [], detail: `India Post directory could not be reached for PIN ${pin}` }
  }
}
