import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { EmptyState } from '../../../shared/ui'
import { CheckboxRow, SelectField, TextareaField, TextField } from '../../../shared/ui/form'
import { type ClientFormData, type ClientFormFieldUpdater } from '../components'
import { useClient, useClients, useCreateClient, useUpdateClient } from '../hooks'
import type { Client } from '../types'
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
  'Sikkhamana',
  'Sayalay',
]

interface NewClientForm {
  nameChn: string
  nameEn: string
  abbr: string
  buddhistTradition: Client['buddhistTradition']
  ordinationStatus: Client['ordinationStatus']
  area: string
}

const initialNewClientForm: NewClientForm = {
  nameChn: '',
  nameEn: '',
  abbr: '',
  buddhistTradition: 'Mahayana',
  ordinationStatus: 'Bhikkhu',
  area: '',
}

export function ClientListPage() {
  const { canFeature } = useAccess()
  const location = useLocation()
  const navigate = useNavigate()
  const { id: routeClientId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: clients = [], isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const [search, setSearch] = useState('')
  const [filterTradition, setFilterTradition] = useState<string>('all')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState<NewClientForm>(initialNewClientForm)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ClientFormData | null>(null)

  const selectedClientId = searchParams.get('client') ?? routeClientId
  const canCreateClient = canFeature('clients.create')
  const canUpdateClient = canFeature('clients.update')
  const canDeleteClient = canFeature('clients.delete') || canUpdateClient
  const canViewDetailedProfile = canFeature('clients.view.full')

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
    setSearchParams({ client: clientId })
  }

  async function submitNewClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const created = await createClient.mutateAsync(buildNewClientPayload(newClientForm))
    setNewClientForm(initialNewClientForm)
    setShowCreateModal(false)
    setSearchParams({ client: created.id })
  }

  function updateNewClientField<Key extends keyof NewClientForm>(key: Key, value: NewClientForm[Key]) {
    setNewClientForm((current) => ({ ...current, [key]: value }))
  }

  function closeCreateModal() {
    if (createClient.isPending) return
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

  async function saveEditClient() {
    if (!editingClientId || !editForm) return
    await updateClient.mutateAsync({ id: editingClientId, data: editForm as Partial<Client> })
    setEditingClientId(null)
    setEditForm(null)
    if (routeWantsEdit) {
      navigate(`/clients/${editingClientId}`, { replace: true })
    }
  }

  const isEditingProfile = Boolean(profileClient && editForm && editingClientId === profileClient.id)

  return (
    <div className="client-workspace">
      <aside className="client-directory" aria-label="Client profiles">
        <div className="client-directory-header">
          <div>
            <h2>僧人档案</h2>
            <span>Client Profiles</span>
          </div>
        </div>

        <div className="client-directory-controls">
          <input
            className="search-input client-directory-search"
            type="text"
            placeholder="搜索法名或缩写 · Search..."
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
              <option value="all">传承 · All</option>
              {TRADITIONS.map((tradition) => (
                <option key={tradition} value={tradition}>{tradition}</option>
              ))}
            </select>
          </div>
          {canCreateClient ? (
            <button className="btn-primary client-create-btn" type="button" onClick={() => setShowCreateModal(true)}>
              + 新增僧人 · New Monastic
            </button>
          ) : null}
        </div>

        <div className="client-directory-list">
          {isLoading ? (
            <div className="client-directory-status">加载中 · Loading...</div>
          ) : filtered.length === 0 ? (
            <div className="client-directory-status">暂无匹配档案 · No clients found</div>
          ) : (
            filtered.map((client) => (
              <button
                key={client.id}
                className={'client-directory-item' + (client.id === selectedClient?.id ? ' active' : '')}
                type="button"
                onClick={() => selectClient(client.id)}
              >
                <div className="client-directory-name">
                  <strong>{client.nameChn}</strong>
                  <span>{client.abbr}</span>
                </div>
                <div className="client-directory-en">{client.nameEn}</div>
                <div className="client-directory-meta">
                  {client.buddhistTradition} · {client.area}
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
              <div className="client-profile-loading">加载完整档案中 · Loading full profile...</div>
            ) : null}
            {isDetailError ? (
              <div className="client-profile-loading client-profile-warning">
                完整档案加载失败，当前显示列表摘要。 / Full profile failed to load. Showing list summary.
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
                showDeleteConfirm={showDeleteConfirm}
                onToggleDeleteConfirm={() => setShowDeleteConfirm((value) => !value)}
                onEdit={() => beginEditClient(profileClient)}
              />
            )}
          </>
        ) : (
          <EmptyState message="请选择一个僧人档案 / Select a client profile" />
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
            <h2 id="new-client-title">新增僧人</h2>
            <span>Add New Monastic</span>
          </div>
          <button className="client-modal-close" type="button" aria-label="Close" onClick={onClose}>
            x
          </button>
        </header>

        <div className="client-create-modal-body">
          <ModalField label="法名（中） / Chinese Dharma Name *">
            <input
              className="form-input"
              required
              value={form.nameChn}
              onChange={(event) => onFieldChange('nameChn', event.target.value)}
            />
          </ModalField>
          <ModalField label="法名（英） / English Dharma Name *">
            <input
              className="form-input"
              required
              value={form.nameEn}
              onChange={(event) => onFieldChange('nameEn', event.target.value)}
            />
          </ModalField>
          <ModalField label="缩写 / Abbreviation *">
            <input
              className="form-input"
              required
              maxLength={8}
              value={form.abbr}
              onChange={(event) => onFieldChange('abbr', event.target.value.toUpperCase())}
            />
          </ModalField>
          <ModalField label="传承 / Tradition *">
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
          <ModalField label="出家身份 / Ordination Status">
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
          <ModalField label="地区 / Area / District">
            <input
              className="form-input"
              value={form.area}
              onChange={(event) => onFieldChange('area', event.target.value)}
            />
          </ModalField>
        </div>

        {error ? <div className="client-create-error">{error}</div> : null}

        <footer className="client-create-modal-footer">
          <button className="btn-secondary" type="button" disabled={submitting} onClick={onClose}>
            取消 · Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={submitting}>
            {submitting ? '创建中 · Creating...' : '创建 · Create Monastic ->'}
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
  showDeleteConfirm: boolean
  onToggleDeleteConfirm: () => void
  onEdit: () => void
}

function ClientProfilePanel({
  client,
  canUpdateClient,
  canDeleteClient,
  canViewDetailedProfile,
  showDeleteConfirm,
  onToggleDeleteConfirm,
  onEdit,
}: ClientProfilePanelProps) {
  return (
    <article className="client-profile">
      <header className="client-profile-header">
        <div>
          <div className="client-profile-title-row">
            <h1>{client.nameChn} / {client.nameEn}</h1>
            <span className="abbr-tag">{client.abbr}</span>
          </div>
          <p>{client.buddhistTradition} · {client.ordinationStatus} · {client.area}</p>
        </div>
        <div className="client-profile-actions">
          <button className="btn-secondary" type="button">
            链接联系人 · Link Contacts
          </button>
          {canUpdateClient ? (
            <button className="btn-edit" type="button" onClick={onEdit}>
              编辑档案 · Edit Profile
            </button>
          ) : null}
          {canDeleteClient ? (
            <button className="btn-danger" type="button" onClick={onToggleDeleteConfirm}>
              删除档案 · Delete
            </button>
          ) : null}
        </div>
      </header>

      {showDeleteConfirm ? (
        <div className="client-danger-banner">
          <span>Manager 操作：删除档案会把记录从活跃列表移除。当前版本仅显示确认入口，等待后端删除/归档 API 接入。</span>
          <button className="btn-secondary btn-compact" type="button" onClick={onToggleDeleteConfirm}>
            取消 · Cancel
          </button>
        </div>
      ) : null}

      <ProfileSection title="基本信息 / Basic Info">
        <InfoCell label="法名（中）" subLabel="Chinese Dharma Name" value={client.nameChn} />
        <InfoCell label="法名（英）" subLabel="English Dharma Name" value={client.nameEn} />
        <InfoCell label="缩写" subLabel="Abbreviation" value={client.abbr} />
        <InfoCell label="联系电话" subLabel="Contact" value={client.contact} />
        <InfoCell label="首选沟通方式" subLabel="Preferred Communication" value={client.preferredCommunication} />
        <InfoCell label="WhatsApp" subLabel="WhatsApp Enabled" value={client.ableToUseWhatsApp ? '是 · Yes' : '否 · No'} />
        <InfoCell label="首选语言" subLabel="Preferred Language" value={client.preferredLanguage} />
        <InfoCell label="使用语言" subLabel="Spoken Language" value={client.spokenLanguage} />
        <InfoCell label="地址" subLabel="Address" value={client.address} />
        <InfoCell label="邮政编码" subLabel="Postal Code" value={client.postalCode} />
        <InfoCell label="地区" subLabel="Area / District" value={client.area} />
        <InfoCell label="居住类型" subLabel="Vihara Type" value={client.viharaType} />
      </ProfileSection>

      {canViewDetailedProfile ? (
        <>
          <ProfileSection title="身份文件 / Identity (IC)">
            <InfoCell label="NRIC 英文姓名" subLabel="NRIC Full Name (English)" value={client.nricNameEn} />
            <InfoCell label="NRIC 中文姓名" subLabel="NRIC Full Name (Chinese)" value={client.nricNameChn} />
            <InfoCell label="NRIC 号码" subLabel="NRIC Number" value={client.nricNo} />
            <InfoCell label="受戒证书" subLabel="Ordination Certificate" value={client.ordinationCertificate} />
            <InfoCell label="核实日期" subLabel="Date of Verification" value={client.dateVerification} />
          </ProfileSection>

          <ProfileSection title="个人信息 / Personal">
            <InfoCell label="性别" subLabel="Sex" value={client.sex} />
            <InfoCell label="出生日期" subLabel="Date of Birth" value={client.dateOfBirth} />
            <InfoCell label="年龄" subLabel="Age" value={`${client.age} 岁`} />
            <InfoCell label="婚姻状况" subLabel="Marital Status" value={client.maritalStatus} />
            <InfoCell label="国籍" subLabel="Nationality" value={client.nationality} />
            <InfoCell label="族群" subLabel="Ethnicity" value={client.ethnicity} />
            <InfoCell label="方言群" subLabel="Dialect Group" value={client.dialectGroup} />
            <InfoCell label="紧急联系人" subLabel="Next of Kin Contact" value={client.nextOfKin} />
          </ProfileSection>

          <ProfileSection title="出家资料 / Ordination">
            <InfoCell label="佛教传承" subLabel="Buddhist Tradition" value={client.buddhistTradition} />
            <InfoCell label="戒别" subLabel="Ordination Status" value={client.ordinationStatus} />
            <InfoCell label="剃度日期" subLabel="Date of Tonsure" value={client.dateTonsure} />
            <InfoCell label="剃度地点" subLabel="Place of Tonsure" value={`${client.placeTonsure}, ${client.countryTonsure}`} />
            <InfoCell label="受戒日期" subLabel="Date of Ordination" value={client.dateOrdination} />
            <InfoCell label="受戒地点" subLabel="Place of Ordination" value={`${client.placeOrdination}, ${client.countryOrdination}`} />
            <InfoCell label="戒龄" subLabel="Ordination Years" value={`${client.ordinationYears} years`} />
          </ProfileSection>

          <ProfileSection title="会员与备注 / Membership">
            <InfoCell label="加入日期" subLabel="Date Joined" value={client.dateJoined} />
            <InfoCell label="会员备注" subLabel="Membership Remarks" value={client.membershipRemarks || '-'} />
            <InfoCell label="整体备注" subLabel="Comments" value={client.comments || '-'} wide />
          </ProfileSection>
        </>
      ) : (
        <div className="volunteer-notice">
          当前账户只能查看基础档案。如需完整资料，请联系 Manager。 / This account can view basic profile information only.
        </div>
      )}
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
  return (
    <article className="client-profile client-profile-edit">
      <header className="client-profile-header">
        <div>
          <div className="client-profile-title-row">
            <h1>{client.nameChn} / {client.nameEn}</h1>
            <span className="abbr-tag">{client.abbr}</span>
          </div>
          <p>编辑档案 · Edit Profile</p>
        </div>
        <div className="client-profile-actions">
          <button className="btn-secondary" type="button" disabled={saving} onClick={onCancel}>
            取消 · Cancel
          </button>
          <button className="btn-primary" type="button" disabled={saving} onClick={onSave}>
            {saving ? '保存中... · Saving...' : '保存修改 · Save Changes'}
          </button>
        </div>
      </header>

      {error ? <div className="client-profile-loading client-profile-warning">{error}</div> : null}

      <ProfileSection title="基本信息 / Basic Info">
        <TextField label="法名（中） / Chinese Dharma Name *" value={form.nameChn} onChange={(value) => onFieldChange('nameChn', value)} />
        <TextField label="法名（英） / English Dharma Name *" value={form.nameEn} onChange={(value) => onFieldChange('nameEn', value)} />
        <TextField label="缩写 / Abbreviation *" value={form.abbr} onChange={(value) => onFieldChange('abbr', value.toUpperCase())} />
        <TextField label="联系电话 / Contact" value={form.contact} onChange={(value) => onFieldChange('contact', value)} />
        <SelectField
          label="首选沟通方式 / Preferred Communication"
          value={form.preferredCommunication}
          options={['WhatsApp Msg', 'WhatsApp Audio', 'Phone Call', 'Home Visit']}
          onChange={(value) => onFieldChange('preferredCommunication', value as Client['preferredCommunication'])}
        />
        <div className="form-group">
          <label className="form-label">WhatsApp 使用能力</label>
          <CheckboxRow
            checked={form.ableToUseWhatsApp}
            label="可以使用 WhatsApp / Able to use WhatsApp"
            onChange={(checked) => onFieldChange('ableToUseWhatsApp', checked)}
          />
        </div>
        <TextField label="首选语言 / Preferred Language" value={form.preferredLanguage} onChange={(value) => onFieldChange('preferredLanguage', value)} />
        <TextField label="使用语言 / Spoken Language" value={form.spokenLanguage} onChange={(value) => onFieldChange('spokenLanguage', value)} />
        <TextField label="地址 / Address" value={form.address} onChange={(value) => onFieldChange('address', value)} fullWidth />
        <TextField label="邮政编码 / Postal Code" value={form.postalCode} onChange={(value) => onFieldChange('postalCode', value)} />
        <TextField label="地区 / Area / District" value={form.area} onChange={(value) => onFieldChange('area', value)} />
        <TextField label="居住类型 / Vihara Type" value={form.viharaType} onChange={(value) => onFieldChange('viharaType', value)} />
      </ProfileSection>

      {canViewDetailedProfile ? (
        <>
          <ProfileSection title="身份文件 / Identity (IC)">
            <TextField label="NRIC 英文姓名 / NRIC Full Name (English)" value={form.nricNameEn} onChange={(value) => onFieldChange('nricNameEn', value)} />
            <TextField label="NRIC 中文姓名 / NRIC Full Name (Chinese)" value={form.nricNameChn} onChange={(value) => onFieldChange('nricNameChn', value)} />
            <TextField label="NRIC 号码 / NRIC Number" value={form.nricNo} onChange={(value) => onFieldChange('nricNo', value)} />
            <SelectField
              label="受戒证书 / Ordination Certificate"
              value={form.ordinationCertificate}
              options={['Completed', 'Incomplete']}
              onChange={(value) => onFieldChange('ordinationCertificate', value as Client['ordinationCertificate'])}
            />
            <TextField label="核实日期 / Date of Verification" type="date" value={form.dateVerification} onChange={(value) => onFieldChange('dateVerification', value)} />
          </ProfileSection>

          <ProfileSection title="个人信息 / Personal">
            <SelectField
              label="性别 / Sex"
              value={form.sex}
              options={['Male', 'Female']}
              onChange={(value) => onFieldChange('sex', value as Client['sex'])}
            />
            <TextField label="出生日期 / Date of Birth" type="date" value={form.dateOfBirth} onChange={(value) => onFieldChange('dateOfBirth', value)} />
            <TextField label="年龄 / Age" type="number" value={String(form.age)} onChange={(value) => onFieldChange('age', Number(value))} />
            <SelectField
              label="婚姻状况 / Marital Status"
              value={form.maritalStatus}
              options={['Never married', 'Married', 'Divorced', 'Separated', 'Widowed']}
              onChange={(value) => onFieldChange('maritalStatus', value as Client['maritalStatus'])}
            />
            <TextField label="国籍 / Nationality" value={form.nationality} onChange={(value) => onFieldChange('nationality', value)} />
            <TextField label="族群 / Ethnicity" value={form.ethnicity} onChange={(value) => onFieldChange('ethnicity', value)} />
            <TextField label="方言群 / Dialect Group" value={form.dialectGroup} onChange={(value) => onFieldChange('dialectGroup', value)} />
            <TextField label="紧急联系人 / Next of Kin Contact" value={form.nextOfKin} onChange={(value) => onFieldChange('nextOfKin', value)} fullWidth />
          </ProfileSection>

          <ProfileSection title="出家资料 / Ordination">
            <SelectField
              label="佛教传承 / Buddhist Tradition"
              value={form.buddhistTradition}
              options={TRADITIONS}
              onChange={(value) => onFieldChange('buddhistTradition', value as Client['buddhistTradition'])}
            />
            <SelectField
              label="戒别 / Ordination Status"
              value={form.ordinationStatus}
              options={ORDINATION_STATUSES}
              onChange={(value) => onFieldChange('ordinationStatus', value as Client['ordinationStatus'])}
            />
            <TextField label="剃度日期 / Date of Tonsure" type="date" value={form.dateTonsure} onChange={(value) => onFieldChange('dateTonsure', value)} />
            <TextField label="剃度国家 / Country of Tonsure" value={form.countryTonsure} onChange={(value) => onFieldChange('countryTonsure', value)} />
            <TextField label="剃度地点 / Place of Tonsure" value={form.placeTonsure} onChange={(value) => onFieldChange('placeTonsure', value)} fullWidth />
            <TextField label="受戒日期 / Date of Ordination" type="date" value={form.dateOrdination} onChange={(value) => onFieldChange('dateOrdination', value)} />
            <TextField label="受戒国家 / Country of Ordination" value={form.countryOrdination} onChange={(value) => onFieldChange('countryOrdination', value)} />
            <TextField label="受戒地点 / Place of Ordination" value={form.placeOrdination} onChange={(value) => onFieldChange('placeOrdination', value)} fullWidth />
            <TextField label="戒龄 / Ordination Years" type="number" value={String(form.ordinationYears)} onChange={(value) => onFieldChange('ordinationYears', Number(value))} />
          </ProfileSection>

          <ProfileSection title="会员与备注 / Membership">
            <TextField label="加入日期 / Date Joined" type="date" value={form.dateJoined} onChange={(value) => onFieldChange('dateJoined', value)} />
            <TextareaField label="会员备注 / Membership Remarks" value={form.membershipRemarks} onChange={(value) => onFieldChange('membershipRemarks', value)} fullWidth />
            <TextareaField label="整体备注 / Comments" value={form.comments} onChange={(value) => onFieldChange('comments', value)} fullWidth />
          </ProfileSection>

          <ProfileSection title="健康评估 / Wellbeing">
            {(Object.keys(form.wellbeingIssues) as Array<keyof Client['wellbeingIssues']>).map((key) => (
              <div key={key} className="form-group">
                <CheckboxRow
                  checked={form.wellbeingIssues[key]}
                  label={formatCamelCase(key)}
                  onChange={() => onToggleWellbeing(key)}
                />
              </div>
            ))}
            <TextareaField label="健康备注 / Wellbeing Remarks" value={form.wellbeingRemarks} onChange={(value) => onFieldChange('wellbeingRemarks', value)} fullWidth />
          </ProfileSection>

          <ProfileSection title="特殊需求与财务 / Needs & Financial">
            {(Object.keys(form.specialNeeds) as Array<keyof Client['specialNeeds']>).map((key) => (
              <div key={key} className="form-group">
                <CheckboxRow
                  checked={form.specialNeeds[key]}
                  label={capitalize(key)}
                  onChange={() => onToggleSpecialNeed(key)}
                />
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">银行转账 / Bank Transfer</label>
              <CheckboxRow checked={form.bankTransfer} label="Bank Transfer" onChange={(checked) => onFieldChange('bankTransfer', checked)} />
            </div>
            <div className="form-group">
              <label className="form-label">PayNow</label>
              <CheckboxRow checked={form.payNow} label="PayNow" onChange={(checked) => onFieldChange('payNow', checked)} />
            </div>
            <TextareaField label="特殊需求备注 / Special Needs Remarks" value={form.specialNeedsRemarks} onChange={(value) => onFieldChange('specialNeedsRemarks', value)} fullWidth />
          </ProfileSection>
        </>
      ) : null}

      <footer className="client-edit-footer">
        <button className="btn-secondary" type="button" disabled={saving} onClick={onCancel}>
          取消 · Cancel
        </button>
        <button className="btn-primary" type="button" disabled={saving} onClick={onSave}>
          {saving ? '保存中... · Saving...' : '保存修改 · Save Changes'}
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
  subLabel,
  value,
  wide = false,
}: {
  label: string
  subLabel: string
  value: string | number
  wide?: boolean
}) {
  return (
    <div className={'client-info-cell' + (wide ? ' wide' : '')}>
      <span>{label}</span>
      <small>{subLabel}</small>
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
    sex: 'Male',
    dateOfBirth: '',
    age: 0,
    maritalStatus: 'Never married',
    nationality: '',
    ethnicity: '',
    dialectGroup: '',
    contact: '',
    nextOfKin: '',
    preferredCommunication: 'Phone Call',
    ableToUseWhatsApp: false,
    preferredLanguage: '',
    spokenLanguage: '',
    address: '',
    postalCode: '',
    viharaType: '',
    area: form.area.trim(),
    dateJoined: today,
    membershipRemarks: '',
    buddhistTradition: form.buddhistTradition,
    ordinationStatus: form.ordinationStatus,
    dateTonsure: '',
    countryTonsure: '',
    placeTonsure: '',
    dateOrdination: '',
    countryOrdination: '',
    placeOrdination: '',
    ordinationYears: 0,
    ordinationCertificate: 'Incomplete',
    dateVerification: '',
    wellbeingIssues: {
      physicalHealth: false,
      mentalHealth: false,
      socialSupport: false,
      financialStability: false,
      livingConditions: false,
      spiritualWellbeing: false,
      legalIssues: false,
      substanceUse: false,
    },
    wellbeingRemarks: '',
    specialNeeds: {
      physical: false,
      hearing: false,
      visual: false,
      intellectual: false,
    },
    specialNeedsRemarks: '',
    bankTransfer: false,
    payNow: false,
    comments: '',
  }
}

function formatCamelCase(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').trim()
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
