import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchClients } from '../../services/client.api'
import type { Client } from '../../types/client'
import { PageHeader } from '../../shared/ui'
import { useAccess } from '../../shared/auth'
import { ClientTable, ClientToolbar } from '../../features/clients/components'
import './clients.css'

export function ClientListPage() {
  const { canFeature } = useAccess()
  const navigate = useNavigate()
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterTradition, setFilterTradition] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const canUpdateClient = canFeature('clients.update')

  useEffect(() => {
    let active = true

    async function load() {
      try {
        const data = await fetchClients()
        if (active) {
          setClients(data)
        }
      } catch {
        // handled silently
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [])

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
        loading={loading}
        canUpdateClient={canUpdateClient}
        onView={(clientId) => navigate(`/clients/${clientId}`)}
        onEdit={(clientId) => navigate(`/clients/${clientId}/edit`)}
      />
    </>
  )
}
