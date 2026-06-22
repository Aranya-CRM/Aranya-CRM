import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { useApprovalAssigneeOptions } from '../../../shared/approvals/useApprovalAssigneeOptions'
import { ApprovalConfirmModal, EmptyState } from '../../../shared/ui'
import { CheckboxRow, SelectField, TextareaField, TextField } from '../../../shared/ui/form'
import { type ClientFormData, type ClientFormFieldUpdater } from '../components'
import { isClientResult, useClient, useClients, useCreateClient, useDeleteClient, useUpdateClient } from '../hooks'
import type { Client, WellbeingDomain } from '../types'
import './clients.css'

const TRADITIONS: Array<Client['buddhistTradition']> = [
  'Theravada',
  'Mahayana',
  'Vajrayana',
]

const ORDINATION_STATUSES: Array<Client['ordinationStatus']> = [
  'Bhikkhu',
  'Bhikkhuni',
  'Samanera',
  'Samaneri',
  'Sikkhamana',
  'Sayalay',
]

const WELLBEING_KEYS: Record<WellbeingDomain, string> = {
  physicalHealth:     'clients.wellbeing.physicalHealth',
  mentalHealth:       'clients.wellbeing.mentalHealth',
  socialSupport:      'clients.wellbeing.socialSupport',
  financialStability: 'clients.wellbeing.financialStability',
  livingConditions:   'clients.wellbeing.livingConditions',
  spiritual:          'clients.wellbeing.spiritual',
  legalIssues:        'clients.wellbeing.legalIssues',
}

interface NewClientForm {
  nameChn: string
  nameEn: string
  abbr: string
  buddhistTradition: Client['buddhistTradition']
  ordinationStatus: Client['ordinationStatus']
  areaDistrict: string
}

const initialNewClientForm: NewClientForm = {
  nameChn: '',
  nameEn: '',
  abbr: '',
  buddhistTradition: 'Mahayana',
  ordinationStatus: 'Bhikkhu',
  areaDistrict: '',
}

type ClientApprovalIntent = 'create' | 'update' | 'delete'

export function ClientListPage() {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const location = useLocation()
  const navigate = useNavigate()
  const { id: routeClientId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: clients = [], isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()
  const approvalAssignees = useApprovalAssigneeOptions()
  const [search, setSearch] = useState('')
  const [filterTradition, setFilterTradition] = useState<string>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState<NewClientForm>(initialNewClientForm)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ClientFormData | null>(null)
  const [approvalMessage, setApprovalMessage] = useState('')
  const [approvalIntent, setApprovalIntent] = useState<ClientApprovalIntent | null>(null)

  const selectedClientId = searchParams.get('client') ?? routeClientId
  const canCreateClient = resolve('clients:create')
  const canUpdateClient = resolve('clients:update')
  const canDeleteClient = resolve('clients:delete')
  const canViewDetailedProfile = resolve('clients:view.full')
  const canConvertToCase = resolve('cases:create')

  const filtered = useMemo(() => {
    return clients.filter((client) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        client.nameChn.includes(q) ||
        client.nameEn.toLowerCase().includes(q) ||
        client.abbr.toLowerCase().includes(q)
      const matchTradition = filterTradition === 'all' || client.buddhistTradition === filterTradition
      return matchSearch && matchTradition
    })
  }, [clients, search, filterTradition])

  const selectedClient = useMemo(() => {
    return filtered.find((client) => client.id === selectedClientId) ?? filtered[0]
  }, [filtered, selectedClientId])
  const {
    data: selectedClientDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useClient(selectedClient?.id)
  const profileClient = selectedClientDetail ?? selectedClient
  const routeWantsEdit = location.pathname.endsWith('/edit')

  useEffect(() => {
    if (!selectedClient || selectedClient.id === selectedClientId) return
    setSearchParams({ client: selectedClient.id }, { replace: true })
  }, [selectedClient, selectedClientId, setSearchParams])

  useEffect(() => {
    setEditingClientId(null)
    setEditForm(null)
  }, [selectedClient?.id])

  useEffect(() => {
    if (!routeWantsEdit || !profileClient || !canUpdateClient || editingClientId === profileClient.id) return
    setShowDeleteConfirm(false)
    setEditingClientId(profileClient.id)
    setEditForm(clientToFormData(profileClient))
  }, [canUpdateClient, editingClientId, profileClient, routeWantsEdit])

  function selectClient(clientId: string) {
    setShowDeleteConfirm(false)
    setApprovalMessage('')
    setSearchParams({ client: clientId })
  }

  function submitNewClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApprovalIntent('create')
  }

  async function confirmCreateClient(approverId?: number) {
    const result = await createClient.mutateAsync({ data: buildNewClientPayload(newClientForm), approverId })
    setNewClientForm(initialNewClientForm)
    setShowCreateModal(false)
    setApprovalIntent(null)
    if (isClientResult(result)) {
      setSearchParams({ client: String(result.id) })
    } else {
      setApprovalMessage(t('clients.approvalSubmittedWithId', { id: result.id }))
    }
  }

  function updateNewClientField<Key extends keyof NewClientForm>(key: Key, value: NewClientForm[Key]) {
    setNewClientForm((current) => ({ ...current, [key]: value }))
  }

  function closeCreateModal() {
    if (createClient.isPending) return
    setApprovalIntent(null)
    setShowCreateModal(false)
    setNewClientForm(initialNewClientForm)
  }

  function beginEditClient(client: Client) {
    setShowDeleteConfirm(false)
    setEditingClientId(client.id)
    setEditForm(clientToFormData(client))
  }

  function cancelEditClient() {
    setEditingClientId(null)
    setEditForm(null)
    if (routeWantsEdit && profileClient) {
      navigate(`/clients/${profileClient.id}`, { replace: true })
    }
  }

  function updateEditField<K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) {
    setEditForm((current) => (current ? { ...current, [key]: value } : current))
  }

  function toggleEditWellbeing(key: keyof Client['wellbeingIssues']) {
    setEditForm((current) => (
      current
        ? {
            ...current,
            wellbeingIssues: {
              ...current.wellbeingIssues,
              [key]: !current.wellbeingIssues[key],
            },
          }
        : current
    ))
  }

  function toggleEditSpecialNeed(key: keyof Client['specialNeeds']) {
    setEditForm((current) => (
      current
        ? {
            ...current,
            specialNeeds: {
              ...current.specialNeeds,
              [key]: !current.specialNeeds[key],
            },
          }
        : current
    ))
  }

  function saveEditClient() {
    if (!editingClientId || !editForm) return
    setApprovalIntent('update')
  }

  async function confirmUpdateClient(approverId?: number) {
    if (!editingClientId || !editForm) return
    const result = await updateClient.mutateAsync({ id: editingClientId, data: editForm as Partial<Client>, approverId })
    const savedClientId = editingClientId
    setEditingClientId(null)
    setEditForm(null)
    setApprovalIntent(null)
    if (!isClientResult(result)) {
      setApprovalMessage(t('clients.approvalSubmittedWithId', { id: result.id }))
    }
    if (routeWantsEdit) {
      navigate(`/clients/${savedClientId}`, { replace: true })
    }
  }

  function confirmDeleteClient() {
    if (!profileClient) return
    setApprovalIntent('delete')
  }

  async function submitDeleteClient(approverId?: number) {
    if (!profileClient) return
    const result = await deleteClient.mutateAsync({ id: profileClient.id, approverId })
    setShowDeleteConfirm(false)
    setEditingClientId(null)
    setEditForm(null)
    setApprovalIntent(null)
    if (result && 'id' in result) {
      setApprovalMessage(t('clients.approvalSubmittedWithId', { id: result.id }))
    }
  }

  const isEditingProfile = Boolean(profileClient && editForm && editingClientId === profileClient.id)
  const approvalPending = createClient.isPending || updateClient.isPending || deleteClient.isPending
  const approvalMessageKey =
    approvalIntent === 'create'
      ? 'approvalConfirm.clientCreate'
      : approvalIntent === 'update'
        ? 'approvalConfirm.clientUpdate'
        : 'approvalConfirm.clientDelete'

  return (
    <div className="client-workspace">
      <aside className="client-directory" aria-label="Client profiles">
        <div className="client-directory-header">
          <div>
            <h2>{t('clients.pageTitle')}</h2>
          </div>
        </div>

        <div className="client-directory-controls">
          <input
            className="search-input client-directory-search"
            type="text"
            placeholder={t('clients.search')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <div className="client-directory-filters">
            <select
              className="filter-select"
              value={filterTradition}
              onChange={(event) => setFilterTradition(event.target.value)}
              aria-label="Filter by tradition"
            >
              <option value="all">{t('clients.filterAll')}</option>
              {TRADITIONS.map((tradition) => (
                <option key={tradition} value={tradition}>{tradition}</option>
              ))}
            </select>
          </div>
          {canCreateClient ? (
            <button className="btn-primary client-create-btn" type="button" onClick={() => setShowCreateModal(true)}>
              + {t('clients.addBtn')}
            </button>
          ) : null}
        </div>

        <div className="client-directory-list">
          {isLoading ? (
            <div className="client-directory-status">{t('clients.loading')}</div>
          ) : filtered.length === 0 ? (
            <div className="client-directory-status">{t('clients.empty')}</div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                className={'client-directory-item' + (client.id === selectedClient?.id ? ' active' : '')}
                type="button"
                onClick={() => selectClient(client.id)}
              >
                <div className="client-directory-name">
                  <strong>{client.abbr}</strong>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className="client-profile-surface">
        {profileClient ? (
          <>
            {isDetailLoading ? (
              <div className="client-profile-loading">{t('clients.profileLoading')}</div>
            ) : null}
            {isDetailError ? (
              <div className="client-profile-loading client-profile-warning">
                {t('clients.profileError')}
              </div>
            ) : null}
            {approvalMessage ? (
              <div className="client-profile-loading client-profile-warning">
                {approvalMessage}
              </div>
            ) : null}
            {isEditingProfile && editForm ? (
              <ClientProfileEditPanel
                client={profileClient}
                form={editForm}
                canViewDetailedProfile={canViewDetailedProfile}
                saving={updateClient.isPending}
                error={updateClient.error instanceof Error ? updateClient.error.message : undefined}
                onCancel={cancelEditClient}
                onSave={saveEditClient}
                onFieldChange={updateEditField}
                onToggleWellbeing={toggleEditWellbeing}
                onToggleSpecialNeed={toggleEditSpecialNeed}
              />
            ) : (
              <ClientProfilePanel
                client={profileClient}
                canUpdateClient={canUpdateClient}
                canDeleteClient={canDeleteClient}
                canViewDetailedProfile={canViewDetailedProfile}
                canConvertToCase={canConvertToCase}
                deleting={deleteClient.isPending}
                deleteError={deleteClient.error instanceof Error ? deleteClient.error.message : undefined}
                showDeleteConfirm={showDeleteConfirm}
                onToggleDeleteConfirm={() => setShowDeleteConfirm((value) => !value)}
                onConfirmDelete={() => void confirmDeleteClient()}
                onEdit={() => beginEditClient(profileClient)}
                onCreateCase={() => navigate(`/cases/new?clientId=${encodeURIComponent(profileClient.id)}`)}
              />
            )}
          </>
        ) : (
          <EmptyState message={t('clients.selectPrompt')} />
        )}
      </main>

      {showCreateModal ? (
        <NewClientModal
          form={newClientForm}
          submitting={createClient.isPending}
          error={createClient.error instanceof Error ? createClient.error.message : undefined}
          onClose={closeCreateModal}
          onSubmit={submitNewClient}
          onFieldChange={updateNewClientField}
        />
      ) : null}

      <ApprovalConfirmModal
        open={approvalIntent !== null}
        title={t('approvalConfirm.title')}
        message={t(approvalMessageKey)}
        confirmLabel={approvalPending ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={approvalPending}
        approverOptions={approvalAssignees.options}
        approverRequired
        approverLoading={approvalAssignees.isLoading}
        onCancel={() => setApprovalIntent(null)}
        onConfirm={(approverId) => {
          if (approvalIntent === 'create') void confirmCreateClient(approverId)
          if (approvalIntent === 'update') void confirmUpdateClient(approverId)
          if (approvalIntent === 'delete') void submitDeleteClient(approverId)
        }}
      />
    </div>
  )
}

function clientToFormData(client: Client): ClientFormData {
  const { id: _id, ...form } = client
  return {
    ...form,
    wellbeingIssues: { ...form.wellbeingIssues },
    specialNeeds: { ...form.specialNeeds },
  }
}

interface NewClientModalProps {
  form: NewClientForm
  submitting: boolean
  error?: string
  onClose: () => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onFieldChange: <Key extends keyof NewClientForm>(key: Key, value: NewClientForm[Key]) => void
}

function NewClientModal({
  form,
  submitting,
  error,
  onClose,
  onSubmit,
  onFieldChange,
}: NewClientModalProps) {
  const { t } = useTranslation()

  return (
    <div className="client-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <form
        className="client-create-modal"
        aria-labelledby="new-client-title"
        onMouseDown={(event) => event.stopPropagation()}
        onSubmit={onSubmit}
      >
        <header className="client-create-modal-header">
          <div>
            <h2 id="new-client-title">{t('clients.modal.title')}</h2>
          </div>
          <button className="client-modal-close" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="client-create-modal-body">
          <ModalField label={`${t('clients.modal.nameChn')} *`}>
            <input
              className="form-input"
              required
              value={form.nameChn}
              onChange={(event) => onFieldChange('nameChn', event.target.value)}
            />
          </ModalField>
          <ModalField label={`${t('clients.modal.nameEn')} *`}>
            <input
              className="form-input"
              required
              value={form.nameEn}
              onChange={(event) => onFieldChange('nameEn', event.target.value)}
            />
          </ModalField>
          <ModalField label={`${t('clients.modal.abbr')} *`}>
            <input
              className="form-input"
              required
              maxLength={8}
              value={form.abbr}
              onChange={(event) => onFieldChange('abbr', event.target.value.toUpperCase())}
            />
          </ModalField>
          <ModalField label={`${t('clients.modal.tradition')} *`}>
            <select
              className="form-select"
              required
              value={form.buddhistTradition}
              onChange={(event) => onFieldChange('buddhistTradition', event.target.value as Client['buddhistTradition'])}
            >
              {TRADITIONS.map((tradition) => (
                <option key={tradition} value={tradition}>{tradition}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label={t('clients.modal.ordinationStatus')}>
            <select
              className="form-select"
              value={form.ordinationStatus}
              onChange={(event) => onFieldChange('ordinationStatus', event.target.value as Client['ordinationStatus'])}
            >
              {ORDINATION_STATUSES.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </ModalField>
          <ModalField label={t('clients.modal.areaDistrict')}>
            <input
              className="form-input"
              value={form.areaDistrict}
              onChange={(event) => onFieldChange('areaDistrict', event.target.value)}
            />
          </ModalField>
        </div>

        {error ? <div className="client-create-error">{error}</div> : null}

        <footer className="client-create-modal-footer">
          <button className="btn-secondary" type="button" disabled={submitting} onClick={onClose}>
            {t('clients.modal.cancel')}
          </button>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? t('clients.modal.creating') : t('clients.modal.create')}
          </button>
        </footer>
      </form>
    </div>
  )
}

function ModalField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="client-modal-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

interface ClientProfilePanelProps {
  client: Client
  canUpdateClient: boolean
  canDeleteClient: boolean
  canViewDetailedProfile: boolean
  canConvertToCase: boolean
  deleting: boolean
  deleteError?: string
  showDeleteConfirm: boolean
  onToggleDeleteConfirm: () => void
  onConfirmDelete: () => void
  onEdit: () => void
  onCreateCase: () => void
}

function ClientProfilePanel({
  client,
  canUpdateClient,
  canDeleteClient,
  canViewDetailedProfile,
  canConvertToCase,
  deleting,
  deleteError,
  showDeleteConfirm,
  onToggleDeleteConfirm,
  onConfirmDelete,
  onEdit,
  onCreateCase,
}: ClientProfilePanelProps) {
  const { t } = useTranslation()

  return (
    <article className="client-profile">
      <header className="client-profile-header">
        <div>
          <div className="client-profile-title-row">
            <h1>{client.nameChn} / {client.nameEn}</h1>
            <span className="abbr-tag">{client.abbr}</span>
          </div>
          <p>{client.buddhistTradition} · {client.ordinationStatus} · {client.areaDistrict}</p>
        </div>
        <div className="client-profile-actions">
          {canConvertToCase ? (
            <button className="btn-primary" type="button" onClick={onCreateCase}>
              {t('clients.profile.convertToCase')}
            </button>
          ) : null}
          {canViewDetailedProfile ? (
            <>
              {canUpdateClient ? (
                <button className="btn-edit" type="button" onClick={onEdit}>
                  {t('clients.profile.editProfile')}
                </button>
              ) : null}
              {canDeleteClient ? (
                <button className="btn-danger" type="button" onClick={onToggleDeleteConfirm}>
                  {t('clients.profile.delete')}
                </button>
              ) : null}
            </>
          ) : null}
        </div>
      </header>

      {showDeleteConfirm ? (
        <div className="client-danger-banner">
          <span>{t('clients.profile.dangerBanner')}</span>
          <button className="btn-secondary btn-compact" type="button" onClick={onToggleDeleteConfirm}>
            {t('clients.profile.cancel')}
          </button>
          <button className="btn-danger btn-compact" type="button" disabled={deleting} onClick={onConfirmDelete}>
            {deleting ? t('common.saving') : t('clients.profile.delete')}
          </button>
        </div>
      ) : null}
      {deleteError ? <div className="client-profile-loading client-profile-warning">{deleteError}</div> : null}

      <ProfileSection title={t('clients.profile.section.basicInfo')}>
        <InfoCell label={t('clients.profile.field.nameChn')} value={client.nameChn} />
        <InfoCell label={t('clients.profile.field.nameEn')} value={client.nameEn} />
        <InfoCell label={t('clients.profile.field.abbr')} value={client.abbr} />
        <InfoCell label={t('clients.profile.field.contact')} value={client.contact} />
        <InfoCell label={t('clients.profile.field.preferredComm')} value={client.preferredCommunication} />
        <InfoCell label="WhatsApp" value={client.whatsappEnabled ? t('clients.profile.field.whatsappYes') : t('clients.profile.field.whatsappNo')} />
        <InfoCell label={t('clients.profile.field.prefLang')} value={client.preferredLanguage} />
        <InfoCell label={t('clients.profile.field.spokenLang')} value={client.spokenLanguage} />
        <InfoCell label={t('clients.profile.field.address')} value={client.addressText} />
        <InfoCell label={t('clients.profile.field.postalCode')} value={client.postalCode} />
        <InfoCell label={t('clients.profile.field.areaDistrict')} value={client.areaDistrict} />
        <InfoCell label={t('clients.profile.field.viharaType')} value={client.viharaType} />
      </ProfileSection>

      {canViewDetailedProfile ? (
        <>
          <ProfileSection title={t('clients.profile.section.identity')}>
            <InfoCell label={t('clients.profile.field.nricNameEn')} value={client.nricNameEn} />
            <InfoCell label={t('clients.profile.field.nricNameChn')} value={client.nricNameChn} />
            <InfoCell label={t('clients.profile.field.nricNo')} value={client.nricNo} />
            <InfoCell label={t('clients.profile.field.ordinationCert')} value={client.ordinationCertificate} />
            <InfoCell label={t('clients.profile.field.dateVerification')} value={client.dateOfVerification} />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.personal')}>
            <InfoCell label={t('clients.profile.field.gender')} value={client.gender} />
            <InfoCell label={t('clients.profile.field.dob')} value={client.dateOfBirth} />
            <InfoCell label={t('clients.profile.field.age')} value={`${client.age} ${t('clients.profile.field.ageUnit')}`} />
            <InfoCell label={t('clients.profile.field.maritalStatus')} value={client.maritalStatus} />
            <InfoCell label={t('clients.profile.field.nationality')} value={client.nationality} />
            <InfoCell label={t('clients.profile.field.ethnicity')} value={client.ethnicity} />
            <InfoCell label={t('clients.profile.field.dialectGroup')} value={client.dialectGroup} />
            <InfoCell label={t('clients.profile.field.nextOfKin')} value={client.nextOfKinContact} />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.ordination')}>
            <InfoCell label={t('clients.profile.field.buddhistTradition')} value={client.buddhistTradition} />
            <InfoCell label={t('clients.profile.field.ordinationStatus')} value={client.ordinationStatus} />
            <InfoCell label={t('clients.profile.field.dateTonsure')} value={client.dateOfTonsure} />
            <InfoCell label={t('clients.profile.field.placeTonsure')} value={`${client.placeOfTonsure}, ${client.countryOfTonsure}`} />
            <InfoCell label={t('clients.profile.field.dateOrdination')} value={client.dateOfOrdination} />
            <InfoCell label={t('clients.profile.field.placeOrdination')} value={`${client.placeOfOrdination}, ${client.countryOfOrdination}`} />
            <InfoCell label={t('clients.profile.field.ordinationYears')} value={`${client.ordinationYears} ${t('clients.profile.field.ordinationYearsUnit')}`} />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.membership')}>
            <InfoCell label={t('clients.profile.field.dateJoined')} value={client.dateJoined} />
            <InfoCell label={t('clients.profile.field.membershipRemarks')} value={client.membershipRemarks || '-'} />
            <InfoCell label={t('clients.profile.field.comments')} value={client.comments || '-'} wide />
          </ProfileSection>
        </>
      ) : null}
    </article>
  )
}

interface ClientProfileEditPanelProps {
  client: Client
  form: ClientFormData
  canViewDetailedProfile: boolean
  saving: boolean
  error?: string
  onCancel: () => void
  onSave: () => void
  onFieldChange: ClientFormFieldUpdater
  onToggleWellbeing: (key: keyof Client['wellbeingIssues']) => void
  onToggleSpecialNeed: (key: keyof Client['specialNeeds']) => void
}

function ClientProfileEditPanel({
  client,
  form,
  canViewDetailedProfile,
  saving,
  error,
  onCancel,
  onSave,
  onFieldChange,
  onToggleWellbeing,
  onToggleSpecialNeed,
}: ClientProfileEditPanelProps) {
  const { t } = useTranslation()

  return (
    <article className="client-profile client-profile-edit">
      <header className="client-profile-header">
        <div>
          <div className="client-profile-title-row">
            <h1>{client.nameChn} / {client.nameEn}</h1>
            <span className="abbr-tag">{client.abbr}</span>
          </div>
          <p>{t('clients.profile.editTitle')}</p>
        </div>
        <div className="client-profile-actions">
          <button className="btn-secondary" type="button" disabled={saving} onClick={onCancel}>
            {t('clients.profile.cancel')}
          </button>
          <button className="btn-primary" type="button" disabled={saving} onClick={onSave}>
            {saving ? t('clients.profile.saving') : t('clients.profile.save')}
          </button>
        </div>
      </header>

      {error ? <div className="client-profile-loading client-profile-warning">{error}</div> : null}

      <ProfileSection title={t('clients.profile.section.basicInfo')}>
        <TextField label={`${t('clients.profile.field.nameChn')} *`} value={form.nameChn} onChange={(value) => onFieldChange('nameChn', value)} />
        <TextField label={`${t('clients.profile.field.nameEn')} *`} value={form.nameEn} onChange={(value) => onFieldChange('nameEn', value)} />
        <TextField label={`${t('clients.profile.field.abbr')} *`} value={form.abbr} onChange={(value) => onFieldChange('abbr', value.toUpperCase())} />
        <TextField label={t('clients.profile.field.contact')} value={form.contact} onChange={(value) => onFieldChange('contact', value)} />
        <SelectField
          label={t('clients.profile.field.preferredComm')}
          value={form.preferredCommunication}
          options={['WhatsApp Msg', 'WhatsApp Audio', 'Phone Call', 'Home Visit']}
          onChange={(value) => onFieldChange('preferredCommunication', value as Client['preferredCommunication'])}
        />
        <div className="form-group">
          <label className="form-label">{t('clients.profile.field.whatsapp')}</label>
          <CheckboxRow
            checked={form.whatsappEnabled}
            label={t('clients.profile.field.whatsappEnabled')}
            onChange={(checked) => onFieldChange('whatsappEnabled', checked)}
          />
        </div>
        <TextField label={t('clients.profile.field.prefLang')} value={form.preferredLanguage} onChange={(value) => onFieldChange('preferredLanguage', value)} />
        <TextField label={t('clients.profile.field.spokenLang')} value={form.spokenLanguage} onChange={(value) => onFieldChange('spokenLanguage', value)} />
        <TextField label={t('clients.profile.field.address')} value={form.addressText} onChange={(value) => onFieldChange('addressText', value)} fullWidth />
        <TextField label={t('clients.profile.field.postalCode')} value={form.postalCode} onChange={(value) => onFieldChange('postalCode', value)} />
        <TextField label={t('clients.profile.field.areaDistrict')} value={form.areaDistrict} onChange={(value) => onFieldChange('areaDistrict', value)} />
        <TextField label={t('clients.profile.field.viharaType')} value={form.viharaType} onChange={(value) => onFieldChange('viharaType', value)} />
      </ProfileSection>

      {canViewDetailedProfile ? (
        <>
          <ProfileSection title={t('clients.profile.section.identity')}>
            <TextField label={t('clients.profile.field.nricNameEn')} value={form.nricNameEn} onChange={(value) => onFieldChange('nricNameEn', value)} />
            <TextField label={t('clients.profile.field.nricNameChn')} value={form.nricNameChn} onChange={(value) => onFieldChange('nricNameChn', value)} />
            <TextField label={t('clients.profile.field.nricNo')} value={form.nricNo} onChange={(value) => onFieldChange('nricNo', value)} />
            <SelectField
              label={t('clients.profile.field.ordinationCert')}
              value={form.ordinationCertificate}
              options={['Completed', 'Incomplete']}
              onChange={(value) => onFieldChange('ordinationCertificate', value as Client['ordinationCertificate'])}
            />
            <TextField label={t('clients.profile.field.dateVerification')} type="date" value={form.dateOfVerification} onChange={(value) => onFieldChange('dateOfVerification', value)} />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.personal')}>
            <SelectField
              label={t('clients.profile.field.gender')}
              value={form.gender}
              options={['Male', 'Female']}
              onChange={(value) => onFieldChange('gender', value as Client['gender'])}
            />
            <TextField label={t('clients.profile.field.dob')} type="date" value={form.dateOfBirth} onChange={(value) => onFieldChange('dateOfBirth', value)} />
            <TextField label={t('clients.profile.field.age')} type="number" value={String(form.age)} onChange={(value) => onFieldChange('age', Number(value))} />
            <SelectField
              label={t('clients.profile.field.maritalStatus')}
              value={form.maritalStatus}
              options={['Never married', 'Married', 'Divorced', 'Separated', 'Widowed']}
              onChange={(value) => onFieldChange('maritalStatus', value as Client['maritalStatus'])}
            />
            <TextField label={t('clients.profile.field.nationality')} value={form.nationality} onChange={(value) => onFieldChange('nationality', value)} />
            <TextField label={t('clients.profile.field.ethnicity')} value={form.ethnicity} onChange={(value) => onFieldChange('ethnicity', value)} />
            <TextField label={t('clients.profile.field.dialectGroup')} value={form.dialectGroup} onChange={(value) => onFieldChange('dialectGroup', value)} />
            <TextField label={t('clients.profile.field.nextOfKin')} value={form.nextOfKinContact} onChange={(value) => onFieldChange('nextOfKinContact', value)} fullWidth />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.ordination')}>
            <SelectField
              label={t('clients.profile.field.buddhistTradition')}
              value={form.buddhistTradition}
              options={TRADITIONS}
              onChange={(value) => onFieldChange('buddhistTradition', value as Client['buddhistTradition'])}
            />
            <SelectField
              label={t('clients.profile.field.ordinationStatus')}
              value={form.ordinationStatus}
              options={ORDINATION_STATUSES}
              onChange={(value) => onFieldChange('ordinationStatus', value as Client['ordinationStatus'])}
            />
            <TextField label={t('clients.profile.field.dateTonsure')} type="date" value={form.dateOfTonsure} onChange={(value) => onFieldChange('dateOfTonsure', value)} />
            <TextField label={t('clients.profile.field.countryTonsure')} value={form.countryOfTonsure} onChange={(value) => onFieldChange('countryOfTonsure', value)} />
            <TextField label={t('clients.profile.field.placeTonsure')} value={form.placeOfTonsure} onChange={(value) => onFieldChange('placeOfTonsure', value)} fullWidth />
            <TextField label={t('clients.profile.field.dateOrdination')} type="date" value={form.dateOfOrdination} onChange={(value) => onFieldChange('dateOfOrdination', value)} />
            <TextField label={t('clients.profile.field.countryOrdination')} value={form.countryOfOrdination} onChange={(value) => onFieldChange('countryOfOrdination', value)} />
            <TextField label={t('clients.profile.field.placeOrdination')} value={form.placeOfOrdination} onChange={(value) => onFieldChange('placeOfOrdination', value)} fullWidth />
            <TextField label={t('clients.profile.field.ordinationYears')} type="number" value={String(form.ordinationYears)} onChange={(value) => onFieldChange('ordinationYears', Number(value))} />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.membership')}>
            <TextField label={t('clients.profile.field.dateJoined')} type="date" value={form.dateJoined} onChange={(value) => onFieldChange('dateJoined', value)} />
            <TextareaField label={t('clients.profile.field.membershipRemarks')} value={form.membershipRemarks} onChange={(value) => onFieldChange('membershipRemarks', value)} fullWidth />
            <TextareaField label={t('clients.profile.field.comments')} value={form.comments} onChange={(value) => onFieldChange('comments', value)} fullWidth />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.wellbeing')}>
            {(Object.keys(form.wellbeingIssues) as Array<keyof Client['wellbeingIssues']>).map((key) => (
              <div key={key} className="form-group">
                <CheckboxRow
                  checked={form.wellbeingIssues[key]}
                  label={t(WELLBEING_KEYS[key])}
                  onChange={() => onToggleWellbeing(key)}
                />
              </div>
            ))}
            <TextareaField label={t('clients.profile.field.wellbeingRemarks')} value={form.wellbeingRemarks} onChange={(value) => onFieldChange('wellbeingRemarks', value)} fullWidth />
          </ProfileSection>

          <ProfileSection title={t('clients.profile.section.needs')}>
            {(Object.keys(form.specialNeeds) as Array<keyof Client['specialNeeds']>).map((key) => (
              <div key={key} className="form-group">
                <CheckboxRow
                  checked={form.specialNeeds[key]}
                  label={capitalize(key)}
                  onChange={() => onToggleSpecialNeed(key)}
                />
              </div>
            ))}
            <TextField label={t('clients.profile.field.bankTransfer')} value={form.bankTransferInfo} onChange={(value) => onFieldChange('bankTransferInfo', value)} />
            <TextField label={t('clients.profile.field.payNow')} value={form.payNowInfo} onChange={(value) => onFieldChange('payNowInfo', value)} />
            <TextareaField label={t('clients.profile.field.specialNeedsRemarks')} value={form.specialNeedsRemarks} onChange={(value) => onFieldChange('specialNeedsRemarks', value)} fullWidth />
          </ProfileSection>
        </>
      ) : null}

      <footer className="client-edit-footer">
        <button className="btn-secondary" type="button" disabled={saving} onClick={onCancel}>
          {t('clients.profile.cancel')}
        </button>
        <button className="btn-primary" type="button" disabled={saving} onClick={onSave}>
          {saving ? t('clients.profile.saving') : t('clients.profile.save')}
        </button>
      </footer>
    </article>
  )
}

function ProfileSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="client-profile-section">
      <h3>{title}</h3>
      <div className="client-profile-grid">{children}</div>
    </section>
  )
}

function InfoCell({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string | number
  wide?: boolean
}) {
  return (
    <div className={'client-info-cell' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function buildNewClientPayload(form: NewClientForm): Omit<Client, 'id'> {
  const today = new Date().toISOString().slice(0, 10)

  return {
    abbr: form.abbr.trim(),
    nameEn: form.nameEn.trim(),
    nameChn: form.nameChn.trim(),
    nricNameEn: '',
    nricNameChn: '',
    nricNo: '',
    gender: 'Male',
    dateOfBirth: '',
    age: 0,
    maritalStatus: 'Never married',
    nationality: '',
    ethnicity: '',
    dialectGroup: '',
    contact: '',
    nextOfKinContact: '',
    preferredCommunication: 'Phone Call',
    whatsappEnabled: false,
    preferredLanguage: '',
    spokenLanguage: '',
    addressText: '',
    postalCode: '',
    viharaType: '',
    areaDistrict: form.areaDistrict.trim(),
    dateJoined: today,
    membershipRemarks: '',
    buddhistTradition: form.buddhistTradition,
    ordinationStatus: form.ordinationStatus,
    dateOfTonsure: '',
    countryOfTonsure: '',
    placeOfTonsure: '',
    dateOfOrdination: '',
    countryOfOrdination: '',
    placeOfOrdination: '',
    ordinationYears: 0,
    ordinationCertificate: 'Incomplete',
    dateOfVerification: '',
    wellbeingIssues: {
      physicalHealth: false,
      mentalHealth: false,
      socialSupport: false,
      financialStability: false,
      livingConditions: false,
      spiritual: false,
      legalIssues: false,
    },
    wellbeingRemarks: '',
    specialNeeds: {
      physical: false,
      hearing: false,
      visual: false,
      intellectual: false,
    },
    specialNeedsRemarks: '',
    bankTransferInfo: '',
    payNowInfo: '',
    comments: '',
  }
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
