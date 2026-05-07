import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { PageHeader } from '../../../shared/ui'
import { ClientTable, ClientToolbar } from '../components'
import { useClients } from '../hooks'
import './clients.css'

export function ClientListPage() {
  const { canFeature } = useAccess()
  const navigate = useNavigate()
  const { data: clients = [], isLoading } = useClients()
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTradition, setFilterTradition] = useState<string>('all')
  const canUpdateClient = canFeature('clients.update')

  const filtered = useMemo(() => {
    return clients.filter((client) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        client.nameChn.includes(q) ||
        client.nameEn.toLowerCase().includes(q) ||
        client.abbr.toLowerCase().includes(q)
      const matchStatus = filterStatus === 'all' || client.membershipStatus === filterStatus
      const matchTradition = filterTradition === 'all' || client.buddhistTradition === filterTradition
      return matchSearch && matchStatus && matchTradition
    })
  }, [clients, search, filterStatus, filterTradition])

  return (
    <>
      <PageHeader titleZh="僧人档案" titleEn="Clients" />

      <ClientToolbar
        search={search}
        filterStatus={filterStatus}
        filterTradition={filterTradition}
        onSearchChange={setSearch}
        onStatusChange={setFilterStatus}
        onTraditionChange={setFilterTradition}
        onCreate={() => navigate('/clients/new')}
      />

      <ClientTable
        clients={filtered}
        loading={isLoading}
        canUpdateClient={canUpdateClient}
        onView={(clientId) => navigate(`/clients/${clientId}`)}
        onEdit={(clientId) => navigate(`/clients/${clientId}/edit`)}
      />
    </>
  )
}
