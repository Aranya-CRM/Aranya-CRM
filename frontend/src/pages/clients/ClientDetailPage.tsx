import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { fetchClientById } from '../../services/client.api'
import type { Client } from '../../types/client'
import { BackButton, PageHeader } from '../../shared/ui'
import { useAccess } from '../../shared/auth'
import {
  ClientDetailTabs,
  MembershipBadge,
  type ClientDetailTabId,
} from '../../features/clients/components'
import './clients.css'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { canFeature } = useAccess()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client>()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<ClientDetailTabId>('basic')

  useEffect(() => {
    let active = true

    async function load() {
      if (!id) return

      try {
        const data = await fetchClientById(id)
        if (active) {
          setClient(data)
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
  }, [id])

  const canViewDetailedProfile = canFeature('clients.view.full')
  const canUpdateClient = canFeature('clients.update')

  if (loading) {
    return <PageHeader titleZh="加载中..." titleEn="Loading..." />
  }

  if (!client) {
    return (
      <>
        <PageHeader titleZh="未找到" titleEn="Client Not Found" />
        <button className="btn-secondary" type="button" style={{ marginTop: 16 }} onClick={() => navigate('/clients')}>
          返回列表 / Back to List
        </button>
      </>
    )
  }

  return (
    <>
      <BackButton onClick={() => navigate('/clients')}>← 返回列表 / Back to List</BackButton>

      <div className="detail-title-row">
        <div className="detail-name">
          <h2>{client.nameChn} / {client.nameEn}</h2>
          <span className="abbr-tag">{client.abbr}</span>
          <MembershipBadge status={client.membershipStatus} />
        </div>
        {canUpdateClient ? (
          <button className="btn-primary" type="button" onClick={() => navigate(`/clients/${client.id}/edit`)}>
            编辑 / Edit
          </button>
        ) : null}
      </div>

      <ClientDetailTabs
        client={client}
        activeTab={activeTab}
        canViewDetailedProfile={canViewDetailedProfile}
        onTabChange={setActiveTab}
      />

      {!canViewDetailedProfile ? (
        <div className="volunteer-notice">
          如需查看完整档案，请联系负责人员。 / For full profile access, please contact the responsible staff.
        </div>
      ) : null}
    </>
  )
}
