import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { BackButton, PageHeader } from '../../../shared/ui'
import {
  ClientDetailTabs,
  type ClientDetailTabId,
} from '../components'
import { useClient } from '../hooks'
import './clients.css'

export function ClientDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { resolve } = useAccess()
  const navigate = useNavigate()
  const { data: client, isLoading } = useClient(id)
  const [activeTab, setActiveTab] = useState<ClientDetailTabId>('basic')

  const canViewDetailedProfile = resolve('clients:view.full')
  const canUpdateClient = resolve('clients:update')

  if (isLoading) {
    return <PageHeader title={t('common.loading')} />
  }

  if (!client) {
    return (
      <>
        <PageHeader title={t('clients.notFound')} />
        <button className="btn-secondary" type="button" style={{ marginTop: 16 }} onClick={() => navigate('/clients')}>
          {t('clients.backToList')}
        </button>
      </>
    )
  }

  return (
    <>
      <BackButton onClick={() => navigate('/clients')} />

      <div className="detail-title-row">
        <div className="detail-name">
          <h2>{client.nameChn} / {client.nameEn}</h2>
          <span className="abbr-tag">{client.abbr}</span>
        </div>
        {canUpdateClient ? (
          <button className="btn-edit" type="button" onClick={() => navigate(`/clients/${client.id}/edit`)}>
            {t('clients.profile.editProfile')}
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
          {t('clients.profile.volunteerNotice')}
        </div>
      ) : null}
    </>
  )
}
