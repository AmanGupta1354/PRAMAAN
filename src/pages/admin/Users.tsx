import { actions, useStore } from '../../lib/store'
import { ROLE_LABEL } from '../../lib/format'
import { Badge, Button, Callout, Card, PageHeader, Td, Th, useToast } from '../../components/ui'

export default function UsersPage() {
  const s = useStore()
  const toast = useToast()
  return (
    <>
      <PageHeader title="Users" sub="Accounts and roles." />
      <Card className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead className="border-b border-line"><tr><Th>Name</Th><Th>Email (display only)</Th><Th>Role</Th><Th>Institution</Th><Th>Status</Th><Th /></tr></thead>
        <tbody className="divide-y divide-line">{s.users.map((u) => (
          <tr key={u.id}><Td className="font-medium">{u.name}</Td><Td className="font-mono text-xs">{u.email}</Td><Td>{ROLE_LABEL[u.role]}</Td><Td className="font-mono text-xs">{u.instId ?? '—'}</Td>
            <Td><Badge tone={u.active ? 'green' : 'gray'}>{u.active ? 'Active' : 'Deactivated'}</Badge></Td>
            <Td><Button size="sm" onClick={() => { const r = actions.toggleUser(u.id); toast(r.ok ? 'ok' : 'bad', r.ok ? 'User updated.' : r.error) }}>{u.active ? 'Deactivate' : 'Activate'}</Button></Td></tr>))}</tbody></table></Card>
    </>
  )
}
