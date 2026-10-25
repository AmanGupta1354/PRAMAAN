import type { AuditEntry } from '../types'
import { sha256 } from './hash'

export const GENESIS = '0'.repeat(64)

export function makeEntry(prev: AuditEntry | undefined, e: Omit<AuditEntry, 'id' | 'prevHash' | 'hash'>): AuditEntry {
  const id = (prev?.id ?? 0) + 1
  const prevHash = prev?.hash ?? GENESIS
  const hash = sha256(`${id}|${e.at}|${e.actor}|${e.role}|${e.action}|${e.target}|${e.detail}|${prevHash}`)
  return { ...e, id, prevHash, hash }
}

/** Tamper-evidence only: detects edits to stored entries, not a privileged attacker who rewrites the whole chain. */
export function verifyChain(entries: AuditEntry[]): { ok: boolean; brokenAt?: number } {
  let prev = GENESIS
  for (const e of entries) {
    const expect = sha256(`${e.id}|${e.at}|${e.actor}|${e.role}|${e.action}|${e.target}|${e.detail}|${prev}`)
    if (e.prevHash !== prev || e.hash !== expect) return { ok: false, brokenAt: e.id }
    prev = e.hash
  }
  return { ok: true }
}
