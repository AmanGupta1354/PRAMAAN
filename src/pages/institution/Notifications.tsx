import { Link } from 'react-router-dom'
import { Bell, CalendarClock, FileWarning, ScanLine, ShieldCheck, Activity, FileCheck2, QrCode } from 'lucide-react'
import { actions, useStore } from '../../lib/store'
import { useMyInstitution } from '../../lib/hooks'
import { fmtDateTime } from '../../lib/format'
import { Button, Card, cn, Empty, PageHeader, SimTag } from '../../components/ui'

const ICONS: Record<string, typeof Bell> = { submission: FileCheck2, verification: Activity, missing: FileWarning, rescan: ScanLine, rectification: ShieldCheck, expiry: CalendarClock, proof: QrCode }

export default function Notifications() {
  const s = useStore()
  const inst = useMyInstitution()
  const items = s.notifications.filter((n) => n.instId === inst?.id)
  return (
    <>
      <PageHeader title="Notifications" sub="Updates on your applications."
        actions={<Button onClick={() => actions.markRead()} disabled={!items.some((n) => !n.read)}>Mark all read</Button>} />
      {items.length === 0 ? <Empty icon={<Bell className="h-8 w-8" />} title="No notifications" /> : (
        <div className="space-y-2">
          {items.map((n) => {
            const I = ICONS[n.kind] ?? Bell
            return (
              <Card key={n.id} className={cn('flex items-start gap-3 p-3', !n.read && 'border-warn/40')}>
                <span className="mt-0.5 grid h-8 w-8 place-items-center rounded-full bg-brand/15 text-brand"><I className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><div className="font-semibold">{n.title}</div><p className="text-sm text-muted">{n.body}</p>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted">{fmtDateTime(n.at)}{n.appId && <Link className="text-brand" to={`/institution/applications/${n.appId}`}>Open {n.appId}</Link>}</div></div>
                {!n.read && <Button size="sm" variant="ghost" onClick={() => actions.markRead(n.id)}>Mark read</Button>}
              </Card>
            )
          })}
        </div>
      )}
    </>
  )
}
