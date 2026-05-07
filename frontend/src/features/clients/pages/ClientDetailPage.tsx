import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { BackButton, PageHeader } from '../../../shared/ui'
import {
  ClientDetailTabs,
  MembershipBadge,
  type ClientDetailTabId,
} from '../components'
import { useClient } from '../hooks'
import './clients.css'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { canFeature } = useAccess()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id)
  const [activeTab, setActiveTab] = useState<ClientDetailTabId>('basic')

  const canViewDetailedProfile = canFeature('clients.view.full')
  const canUpdateClient = canFeature('clients.update')

  if (isLoading) {
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
