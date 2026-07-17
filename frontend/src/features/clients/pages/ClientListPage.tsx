import { useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, FormEvent, ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { useApprovalAssigneeOptions } from '../../../shared/approvals/useApprovalAssigneeOptions'
import { ApprovalConfirmModal } from '../../../shared/ui'
import { CheckboxRow, SelectField, TextareaField, TextField } from '../../../shared/ui/form'
import { useAuth } from '../../../contexts/AuthContext'
import { useApproveRequest, usePendingApprovals, useRejectRequest } from '../../approvals/api/approval.api'
import { useCases, useDeleteCase } from '../../cases/hooks'
import type { Case } from '../../cases/types'
import { type ClientFormData, type ClientFormFieldUpdater } from '../components'
import { isClientResult, useClient, useClients, useClientsAvailableForCase, useCreateClient, useDeleteClient, useRestoreClient, useUpdateClient } from '../hooks'
import type { Client, WellbeingDomain } from '../types'
import {
  applyClientCaseFilter,
  applyClientGenderFilter,
  applyClientOrdinationStatusFilter,
  applyClientStatusFilter,
  countActiveClientFilters,
  deriveClientDateFields,
  isClientClosed,
  profileActionGroups,
  sortClientDirectory,
  type ClientArchiveFilter,
  type ClientCaseFilter,
  type ClientDirectorySort,
  type ClientGenderFilter,
  type ClientOrdinationStatusFilter,
} from './clientProfileUtils'
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

const GENDERS: Array<Client['gender']> = ['Female', 'Male']

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

type ClientApprovalIntent = 'create' | 'delete' | 'restore' | 'closeCase'
type ClientApprovalOperation = 'create' | 'update' | 'delete' | 'restore'

interface ClientApprovalView {
  id: number
  type: string
  targetId?: number | string | null
  targetLabel?: string | null
  payloadJson?: string | null
  requestedById?: number | null
  requestedByName?: string | null
  assignedApproverId?: number | null
  createdAt?: string | null
}

interface ClientDirectoryItem {
  key: string
  display: Pick<Client, 'abbr' | 'nameEn' | 'nameChn' | 'buddhistTradition' | 'gender' | 'ordinationStatus'>
  client?: Client
  approval?: ClientApprovalView
  operation?: ClientApprovalOperation
}

export function ClientListPage() {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const { user } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const { id: routeClientId } = useParams<{ id: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: clients = [], isLoading } = useClients()
  const { data: clientsAvailableForCase = [] } = useClientsAvailableForCase()
  const { data: cases = [] } = useCases()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()
  const restoreClient = useRestoreClient()
  const closeCase = useDeleteCase()
  const { data: pendingApprovals = [] } = usePendingApprovals()
  const approveRequest = useApproveRequest()
  const rejectRequest = useRejectRequest()
  const [search, setSearch] = useState('')
  const [filterTradition, setFilterTradition] = useState<string>('all')
  const [filterCase, setFilterCase] = useState<ClientCaseFilter>('all')
  const [filterArchive, setFilterArchive] = useState<ClientArchiveFilter>('current')
  const [filterGender, setFilterGender] = useState<ClientGenderFilter>('all')
  const [filterOrdinationStatus, setFilterOrdinationStatus] = useState<ClientOrdinationStatusFilter>('all')
  const [directorySort, setDirectorySort] = useState<ClientDirectorySort>('default')
  const [filterPanelTab, setFilterPanelTab] = useState<'filters' | 'sort'>('filters')
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [filterPopoverStyle, setFilterPopoverStyle] = useState<CSSProperties | undefined>()
  const filterMenuRef = useRef<HTMLDivElement | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newClientForm, setNewClientForm] = useState<NewClientForm>(initialNewClientForm)
  const [editingClientId, setEditingClientId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<ClientFormData | null>(null)
  const [approvalIntent, setApprovalIntent] = useState<ClientApprovalIntent | null>(null)
  const [profileCollapsed, setProfileCollapsed] = useState(false)
  const approvalAssignees = useApprovalAssigneeOptions({ allowSelfAssignment: approvalIntent === 'create' || approvalIntent === 'restore' })

  const selectedApprovalId = searchParams.get('approval')
  const selectedClientId = searchParams.get('client') ?? routeClientId
  const canCreateClient = resolve('clients:create')
  const canUpdateClient = resolve('clients:update')
  const canDeleteClient = resolve('clients:delete')
  const canViewDetailedProfile = resolve('clients:view.full')
  const canConvertToCase = resolve('cases:create')
  const canCloseCase = resolve('cases:delete')
  const isAdminView = resolve('admin:console.access')
  const activeFilterCount = countActiveClientFilters(
    filterTradition,
    filterCase,
    filterArchive,
    filterGender,
    filterOrdinationStatus,
    directorySort,
  )

  const withoutCaseIds = useMemo(
    () => new Set(clientsAvailableForCase.map((client) => client.id)),
    [clientsAvailableForCase],
  )

  // 「有个案」以真实个案列表为准(与资料卡的 activeProfileCase、查看个案按钮同一口径),
  // 而不是取 /without-case 的补集——后者还会额外排除非 active 会员与待审批会员,会误判。
  const withCaseIds = useMemo(
    () => new Set(
      cases
        .filter((item) => !['CLOSED', 'DELETED'].includes(String(item.status).toUpperCase()))
        .map((item) => item.clientId),
    ),
    [cases],
  )

  const filtered = useMemo(() => {
    const matched = applyClientOrdinationStatusFilter(
      applyClientGenderFilter(
        applyClientCaseFilter(
          applyClientStatusFilter(clients, filterArchive),
          withCaseIds,
          filterCase,
        ),
        filterGender,
      ),
      filterOrdinationStatus,
    ).filter((client) => {
      const q = search.toLowerCase()
      const matchSearch =
        !q ||
        client.nameChn.includes(q) ||
        client.nameEn.toLowerCase().includes(q) ||
        client.abbr.toLowerCase().includes(q)
      const matchTradition = filterTradition === 'all' || client.buddhistTradition === filterTradition
      return matchSearch && matchTradition
    })
    return sortClientDirectory(matched, directorySort)
  }, [clients, directorySort, filterArchive, filterCase, filterGender, filterOrdinationStatus, filterTradition, search, withCaseIds])

  const clientApprovalItems = useMemo(() => {
    return pendingApprovals.filter((approval) => isClientApprovalType(approval.type))
  }, [pendingApprovals])

  const pendingApprovalByClientId = useMemo(() => {
    const map = new Map<string, ClientApprovalView>()
    clientApprovalItems
      .filter((approval) => approval.type === 'CLIENT_UPDATE' || approval.type === 'DELETE_CLIENT' || approval.type === 'RESTORE_CLIENT')
      .forEach((approval) => {
        if (approval.targetId == null) return
        const clientId = String(approval.targetId)
        if (!map.has(clientId)) map.set(clientId, approval)
      })
    return map
  }, [clientApprovalItems])

  const createApprovalDirectoryItems = useMemo(() => {
    if (filterArchive === 'closed' || filterCase === 'with_case') return []
    return clientApprovalItems
      .filter((approval) => approval.type === 'CLIENT_CREATE')
      .map((approval): ClientDirectoryItem => ({
        key: `approval:${approval.id}`,
        display: clientFromApproval(approval),
        approval,
        operation: 'create',
      }))
      .filter((item) => clientDirectoryItemMatches(item, search, filterTradition, filterGender, filterOrdinationStatus))
  }, [clientApprovalItems, filterArchive, filterCase, filterGender, filterOrdinationStatus, filterTradition, search])

  const directoryItems = useMemo(() => {
    return [
      ...createApprovalDirectoryItems,
      ...filtered.map((client): ClientDirectoryItem => {
        const approval = pendingApprovalByClientId.get(client.id)
        return {
          key: `client:${client.id}`,
          display: client,
          client,
          approval,
          operation: approval ? approvalOperation(approval) : undefined,
        }
      }),
    ]
  }, [createApprovalDirectoryItems, filtered, pendingApprovalByClientId])

  const selectedCreateApproval = useMemo(() => {
    if (!selectedApprovalId) return undefined
    return clientApprovalItems.find((approval) => (
      approval.type === 'CLIENT_CREATE' && String(approval.id) === selectedApprovalId
    ))
  }, [clientApprovalItems, selectedApprovalId])

  const selectedClient = useMemo(() => {
    if (selectedCreateApproval) return undefined
    if (!selectedClientId) return undefined
    return filtered.find((client) => client.id === selectedClientId)
  }, [filtered, selectedClientId, selectedCreateApproval])
  const {
    data: selectedClientDetail,
    isLoading: isDetailLoading,
    isError: isDetailError,
  } = useClient(selectedClient?.id)
  const profileClient = selectedClientDetail ?? selectedClient
  const profileApproval = selectedCreateApproval ?? (profileClient ? pendingApprovalByClientId.get(profileClient.id) : undefined)
  const profileOperation = profileApproval ? approvalOperation(profileApproval) : undefined
  const displayProfileClient = selectedCreateApproval
    ? clientFromApproval(selectedCreateApproval)
    : profileClient && profileApproval?.type === 'CLIENT_UPDATE'
      ? applyApprovalToClient(profileClient, profileApproval)
      : profileClient
  const profileClosed = Boolean(displayProfileClient && isClientClosed(displayProfileClient))
  const changedFields = profileClient && profileApproval?.type === 'CLIENT_UPDATE'
    ? changedClientFields(profileClient, displayProfileClient)
    : new Set<keyof Client>()
  const serverProfileApproval = profileApproval
    ? pendingApprovals.find((approval) => approval.id === profileApproval.id)
    : undefined
  const activeProfileCase = useMemo(() => {
    if (!profileClient) return undefined
    return cases.find((item) => item.clientId === profileClient.id && !['CLOSED', 'DELETED'].includes(String(item.status).toUpperCase()))
  }, [cases, profileClient])
  const closeCasePending = Boolean(activeProfileCase && pendingApprovals.some((approval) => (
    approval.type === 'DELETE_CASE' && String(approval.targetId) === String(activeProfileCase.id)
  )))
  const routeWantsEdit = location.pathname.endsWith('/edit')

  useEffect(() => {
    setEditingClientId(null)
    setEditForm(null)
  }, [selectedClient?.id])

  useEffect(() => {
    if (!routeWantsEdit || !profileClient || profileClosed || !canUpdateClient || editingClientId === profileClient.id) return
    setEditingClientId(profileClient.id)
    setEditForm(clientToFormData(profileClient))
  }, [canUpdateClient, editingClientId, profileClient, profileClosed, routeWantsEdit])

  useEffect(() => {
    if (!filterMenuOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (filterMenuRef.current?.contains(event.target as Node)) return
      setFilterMenuOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setFilterMenuOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [filterMenuOpen])

  function selectClient(clientId: string) {
    setSearchParams({ client: clientId })
  }

  function selectApproval(approvalId: number) {
    setSearchParams({ approval: String(approvalId) })
  }

  function toggleFilterMenu() {
    if (!filterMenuOpen && filterMenuRef.current) {
      const rect = filterMenuRef.current.getBoundingClientRect()
      const panelWidth = Math.min(386, window.innerWidth - 32)
      setFilterPopoverStyle({
        top: Math.round(rect.bottom + 8),
        left: Math.round(Math.min(Math.max(16, rect.left), window.innerWidth - panelWidth - 16)),
      })
    }
    setFilterMenuOpen((open) => !open)
  }

  function printProfile() {
    window.setTimeout(() => window.print(), 0)
  }

  function submitNewClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setApprovalIntent('create')
  }

  async function confirmCreateClient(approverId?: number, reason?: string) {
    const result = await createClient.mutateAsync({ data: buildNewClientPayload(newClientForm), approverId, reason })
    setNewClientForm(initialNewClientForm)
    setShowCreateModal(false)
    setApprovalIntent(null)
    if (isClientResult(result)) {
      setSearchParams({ client: String(result.id) })
    } else {
      navigate('/clients')
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
    if (isClientClosed(client)) return
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
    setEditForm((current) => {
      if (!current) return current
      const next = { ...current, [key]: value }
      if (key === 'dateOfBirth' || key === 'dateOfOrdination') {
        return {
          ...next,
          ...deriveClientDateFields({
            dateOfBirth: next.dateOfBirth,
            dateOfOrdination: next.dateOfOrdination,
          }),
        }
      }
      return next
    })
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
    try {
      const savedClientId = editingClientId
      await updateClient.mutateAsync({ id: editingClientId, data: editForm as Partial<Client> })
      setEditingClientId(null)
      setEditForm(null)
      if (routeWantsEdit) {
        navigate(`/clients/${savedClientId}`, { replace: true })
      }
    } catch {
      // The mutation error is rendered by ClientProfileEditPanel.
    }
  }

  function confirmDeleteClient() {
    if (!profileClient) return
    setApprovalIntent('delete')
  }

  async function submitDeleteClient(approverId?: number, reason?: string) {
    if (!profileClient) return
    await deleteClient.mutateAsync({ id: profileClient.id, approverId, reason })
    setEditingClientId(null)
    setEditForm(null)
    setApprovalIntent(null)
  }

  function confirmRestoreClient() {
    if (!profileClient) return
    setApprovalIntent('restore')
  }

  async function restoreSelectedClient(approverId?: number, reason?: string) {
    if (!profileClient) return
    await restoreClient.mutateAsync({ id: profileClient.id, approverId, reason })
    setApprovalIntent(null)
  }

  function confirmCloseCase() {
    if (!activeProfileCase || closeCasePending) return
    setApprovalIntent('closeCase')
  }

  async function submitCloseCase(approverId?: number, reason?: string) {
    if (!activeProfileCase) return
    await closeCase.mutateAsync({ id: activeProfileCase.id, approverId, reason })
    setApprovalIntent(null)
  }

  const isEditingProfile = Boolean(profileClient && editForm && editingClientId === profileClient.id)
  const approvalPending = createClient.isPending || deleteClient.isPending || restoreClient.isPending || closeCase.isPending
  const approvalMessageKey =
    approvalIntent === 'create'
      ? 'approvalConfirm.clientCreate'
      : approvalIntent === 'closeCase'
        ? 'approvalConfirm.caseDelete'
        : approvalIntent === 'restore'
          ? 'approvalConfirm.clientRestore'
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
          <div className="client-directory-search-row" ref={filterMenuRef}>
            <input
              className="search-input client-directory-search"
              type="text"
              placeholder={t('clients.search')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <div className="client-directory-filter-menu">
              <button
                className={'client-filter-button' + (activeFilterCount > 0 ? ' active' : '')}
                type="button"
                aria-label={t('clients.filterButton')}
                aria-haspopup="menu"
                aria-expanded={filterMenuOpen}
                onClick={toggleFilterMenu}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M4 5h16l-6.4 7.2v5.1l-3.2 1.7v-6.8L4 5z" />
                </svg>
              </button>
            </div>
            {filterMenuOpen ? (
                <div className="client-filter-popover" role="menu" style={filterPopoverStyle}>
                  <div className="client-filter-tabs" role="tablist" aria-label={t('clients.filterPanelLabel')}>
                    <button
                      className={filterPanelTab === 'filters' ? 'active' : ''}
                      type="button"
                      role="tab"
                      aria-selected={filterPanelTab === 'filters'}
                      onClick={() => setFilterPanelTab('filters')}
                    >
                      {t('clients.filterTabFilters')}
                    </button>
                    <button
                      className={filterPanelTab === 'sort' ? 'active' : ''}
                      type="button"
                      role="tab"
                      aria-selected={filterPanelTab === 'sort'}
                      onClick={() => setFilterPanelTab('sort')}
                    >
                      {t('clients.filterTabSort')}
                    </button>
                  </div>

                  {filterPanelTab === 'filters' ? (
                    <div className="client-filter-grid">
                      <FilterGroup label={t('clients.filterArchiveLabel')} compact>
                        {(['current', 'closed'] as ClientArchiveFilter[]).map((value) => (
                          <FilterChip
                            key={value}
                            active={filterArchive === value}
                            onClick={() => setFilterArchive(value)}
                          >
                            {value === 'closed' ? t('clients.filterClosed') : t('clients.filterCurrent')}
                          </FilterChip>
                        ))}
                      </FilterGroup>
                      <FilterGroup label={t('clients.filterGenderLabel')} compact>
                        <FilterChip active={filterGender === 'all'} onClick={() => setFilterGender('all')}>
                          {t('clients.filterAllShort')}
                        </FilterChip>
                        {GENDERS.map((gender) => (
                          <FilterChip key={gender} active={filterGender === gender} onClick={() => setFilterGender(gender)}>
                            {t(`clients.profile.field.gender${gender}`)}
                          </FilterChip>
                        ))}
                      </FilterGroup>
                      <FilterGroup label={t('clients.filterTraditionLabel')}>
                        <FilterChip active={filterTradition === 'all'} onClick={() => setFilterTradition('all')}>
                          {t('clients.filterAllShort')}
                        </FilterChip>
                        {TRADITIONS.map((tradition) => (
                          <FilterChip
                            key={tradition}
                            active={filterTradition === tradition}
                            onClick={() => setFilterTradition(tradition)}
                          >
                            {tradition}
                          </FilterChip>
                        ))}
                      </FilterGroup>
                      <FilterGroup label={t('clients.filterCaseLabel')}>
                        <FilterChip active={filterCase === 'all'} onClick={() => setFilterCase('all')}>
                          {t('clients.filterCaseAllShort')}
                        </FilterChip>
                        <FilterChip active={filterCase === 'with_case'} onClick={() => setFilterCase('with_case')}>
                          {t('clients.filterWithCase')}
                        </FilterChip>
                        <FilterChip active={filterCase === 'without_case'} onClick={() => setFilterCase('without_case')}>
                          {t('clients.filterWithoutCase')}
                        </FilterChip>
                      </FilterGroup>
                      <FilterGroup label={t('clients.filterOrdinationStatusLabel')} wide>
                        <FilterChip active={filterOrdinationStatus === 'all'} onClick={() => setFilterOrdinationStatus('all')}>
                          {t('clients.filterAllShort')}
                        </FilterChip>
                        {ORDINATION_STATUSES.map((status) => (
                          <FilterChip
                            key={status}
                            active={filterOrdinationStatus === status}
                            onClick={() => setFilterOrdinationStatus(status)}
                          >
                            {status}
                          </FilterChip>
                        ))}
                      </FilterGroup>
                    </div>
                  ) : (
                    <div className="client-filter-sort-panel">
                      <FilterGroup label={t('clients.sortAgeLabel')}>
                        <FilterChip active={directorySort === 'age_asc'} onClick={() => setDirectorySort('age_asc')}>
                          {t('clients.sortAgeAsc')}
                        </FilterChip>
                        <FilterChip active={directorySort === 'age_desc'} onClick={() => setDirectorySort('age_desc')}>
                          {t('clients.sortAgeDesc')}
                        </FilterChip>
                      </FilterGroup>
                      <FilterGroup label={t('clients.sortOrdinationYearsLabel')}>
                        <FilterChip active={directorySort === 'ordination_years_asc'} onClick={() => setDirectorySort('ordination_years_asc')}>
                          {t('clients.sortOrdinationYearsAsc')}
                        </FilterChip>
                        <FilterChip active={directorySort === 'ordination_years_desc'} onClick={() => setDirectorySort('ordination_years_desc')}>
                          {t('clients.sortOrdinationYearsDesc')}
                        </FilterChip>
                      </FilterGroup>
                      <button
                        className={'client-filter-sort-reset' + (directorySort === 'default' ? ' active' : '')}
                        type="button"
                        onClick={() => setDirectorySort('default')}
                      >
                        {t('clients.sortDefault')}
                      </button>
                    </div>
                  )}

                  {activeFilterCount > 0 ? (
                    <button
                      className="client-filter-clear"
                      type="button"
                      onClick={() => {
                        setFilterTradition('all')
                        setFilterCase('all')
                        setFilterArchive('current')
                        setFilterGender('all')
                        setFilterOrdinationStatus('all')
                        setDirectorySort('default')
                      }}
                    >
                      {t('clients.filterClear')} · {activeFilterCount}
                    </button>
                  ) : null}
                </div>
              ) : null}
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
          ) : directoryItems.length === 0 ? (
            <div className="client-directory-status">{t('clients.empty')}</div>
          ) : (
            directoryItems.map((item) => (
              <button
                key={item.key}
                className={
                  'client-directory-item' +
                  (directoryItemActive(item, selectedClient?.id, selectedCreateApproval?.id) ? ' active' : '') +
                  (item.operation ? ` pending ${item.operation}` : '') +
                  (item.client && isClientClosed(item.client) ? ' closed' : '')
                }
                type="button"
                onClick={() => item.approval?.type === 'CLIENT_CREATE'
                  ? selectApproval(item.approval.id)
                  : item.client ? selectClient(item.client.id) : undefined}
              >
                <div className="client-directory-name">
                  <strong>{item.display.abbr || '-'}</strong>
                  {item.operation ? (
                    <span className={`client-directory-approval-badge ${item.operation}`}>
                      {t(`clients.approvals.badge.${item.operation}`)}
                    </span>
                  ) : null}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      <main className={'client-profile-surface' + (!displayProfileClient ? ' empty' : '')}>
        {displayProfileClient ? (
          <>
            {isDetailLoading && !selectedCreateApproval ? (
              <div className="client-profile-loading">{t('clients.profileLoading')}</div>
            ) : null}
            {isDetailError && !selectedCreateApproval ? (
              <div className="client-profile-loading client-profile-warning">
                {t('clients.profileError')}
              </div>
            ) : null}
            {isEditingProfile && editForm ? (
              <ClientProfileEditPanel
                client={displayProfileClient}
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
                client={displayProfileClient}
                pendingApproval={profileApproval}
                approvalOperation={profileOperation}
                changedFields={changedFields}
                canDecideApproval={resolve('approvals:decide') && canDecideApproval(serverProfileApproval, user?.id)}
                decidingApproval={approveRequest.isPending || rejectRequest.isPending}
                onApproveApproval={() => serverProfileApproval ? void approveRequest.mutateAsync({ id: serverProfileApproval.id, data: {} }) : undefined}
                onRejectApproval={() => serverProfileApproval ? void rejectRequest.mutateAsync({ id: serverProfileApproval.id, data: {} }) : undefined}
                closed={profileClosed}
                canUpdateClient={!profileApproval && !profileClosed && canUpdateClient}
                canDeleteClient={!isAdminView && !profileApproval && !profileClosed && canDeleteClient}
                canRestoreClient={!profileApproval && profileClosed && canDeleteClient}
                canViewDetailedProfile={canViewDetailedProfile}
                canConvertToCase={!isAdminView && !profileApproval && !profileClosed && canConvertToCase && Boolean(profileClient && withoutCaseIds.has(profileClient.id))}
                activeCase={activeProfileCase}
                canCloseCase={!isAdminView && !profileApproval && !profileClosed && canCloseCase && Boolean(activeProfileCase)}
                collapsed={profileCollapsed}
                closeCasePending={closeCasePending}
                closingCase={closeCase.isPending}
                deleting={deleteClient.isPending}
                restoring={restoreClient.isPending}
                deleteError={deleteClient.error instanceof Error ? deleteClient.error.message : undefined}
                restoreError={restoreClient.error instanceof Error ? restoreClient.error.message : undefined}
                onConfirmDelete={() => void confirmDeleteClient()}
                onRestore={() => confirmRestoreClient()}
                onConfirmCloseCase={() => void confirmCloseCase()}
                onEdit={() => profileClient ? beginEditClient(profileClient) : undefined}
                onCreateCase={() => profileClient ? navigate(`/cases/new?clientId=${encodeURIComponent(profileClient.id)}`) : undefined}
                onViewCase={() => activeProfileCase ? navigate(`/cases/${activeProfileCase.id}`) : undefined}
                onPrint={printProfile}
                onToggleCollapsed={() => setProfileCollapsed((collapsed) => !collapsed)}
              />
            )}
          </>
        ) : (
          null
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
        onConfirm={(approverId, reason) => {
          if (approvalIntent === 'create') void confirmCreateClient(approverId, reason)
          if (approvalIntent === 'delete') void submitDeleteClient(approverId, reason)
          if (approvalIntent === 'restore') void restoreSelectedClient(approverId, reason)
          if (approvalIntent === 'closeCase') void submitCloseCase(approverId, reason)
        }}
      />
    </div>
  )
}

function canDecideApproval(approval: ClientApprovalView | undefined, currentUserId: number | undefined) {
  if (!approval || currentUserId === undefined) return false
  if (approval.requestedById === currentUserId) {
    return (approval.type === 'CLIENT_CREATE' || approval.type === 'RESTORE_CLIENT') && approval.assignedApproverId === currentUserId
  }
  return approval.assignedApproverId == null || approval.assignedApproverId === currentUserId
}

function approvalOperation(approval: ClientApprovalView): ClientApprovalOperation {
  if (approval.type === 'CLIENT_CREATE') return 'create'
  if (approval.type === 'DELETE_CLIENT') return 'delete'
  if (approval.type === 'RESTORE_CLIENT') return 'restore'
  return 'update'
}

function directoryItemActive(item: ClientDirectoryItem, selectedClientId?: string, selectedApprovalId?: number) {
  if (item.approval?.type === 'CLIENT_CREATE') {
    return selectedApprovalId === item.approval.id
  }
  return Boolean(item.client && item.client.id === selectedClientId)
}

function clientDirectoryItemMatches(
  item: ClientDirectoryItem,
  search: string,
  tradition: string,
  gender: ClientGenderFilter,
  ordinationStatus: ClientOrdinationStatusFilter,
) {
  const q = search.trim().toLowerCase()
  const matchesSearch =
    !q ||
    item.display.nameChn.includes(q) ||
    item.display.nameEn.toLowerCase().includes(q) ||
    item.display.abbr.toLowerCase().includes(q)
  const matchesTradition = tradition === 'all' || item.display.buddhistTradition === tradition
  const matchesGender = gender === 'all' || item.display.gender === gender
  const matchesOrdinationStatus = ordinationStatus === 'all' || item.display.ordinationStatus === ordinationStatus
  return matchesSearch && matchesTradition && matchesGender && matchesOrdinationStatus
}

function clientFromApproval(approval: ClientApprovalView): Client {
  return {
    ...emptyClientProfile(),
    ...clientPatchFromApproval(approval),
    id: `approval-${approval.id}`,
  }
}

function applyApprovalToClient(client: Client, approval: ClientApprovalView): Client {
  return {
    ...client,
    ...clientPatchFromApproval(approval),
  }
}

function clientPatchFromApproval(approval: ClientApprovalView): Partial<Client> {
  const payload = parseApprovalPayload(approval.payloadJson)
  const patch: Partial<Client> = {}
  assignString(patch, payload, 'abbr')
  assignString(patch, payload, 'nameEn')
  assignString(patch, payload, 'nameChn')
  assignString(patch, payload, 'nricNameEn')
  assignString(patch, payload, 'nricNameChn')
  assignString(patch, payload, 'nricNo')
  assignString(patch, payload, 'dateOfVerification')
  assignString(patch, payload, 'gender')
  assignString(patch, payload, 'dateOfBirth')
  assignNumber(patch, payload, 'age')
  assignString(patch, payload, 'maritalStatus')
  assignString(patch, payload, 'nationality')
  assignString(patch, payload, 'ethnicity')
  assignString(patch, payload, 'dialectGroup')
  assignString(patch, payload, 'contact')
  assignString(patch, payload, 'nextOfKinContact')
  assignString(patch, payload, 'preferredCommunication')
  assignBoolean(patch, payload, 'whatsappEnabled')
  assignString(patch, payload, 'preferredLanguage')
  assignString(patch, payload, 'spokenLanguage')
  assignString(patch, payload, 'addressText')
  assignString(patch, payload, 'postalCode')
  assignString(patch, payload, 'viharaType')
  assignString(patch, payload, 'areaDistrict')
  assignString(patch, payload, 'dateJoined')
  assignString(patch, payload, 'membershipRemarks')
  assignString(patch, payload, 'buddhistTradition')
  assignString(patch, payload, 'ordinationStatus')
  assignString(patch, payload, 'dateOfTonsure')
  assignString(patch, payload, 'countryOfTonsure')
  assignString(patch, payload, 'placeOfTonsure')
  assignString(patch, payload, 'dateOfOrdination')
  assignString(patch, payload, 'countryOfOrdination')
  assignString(patch, payload, 'placeOfOrdination')
  assignNumber(patch, payload, 'ordinationYears')
  assignString(patch, payload, 'wellbeingRemarks')
  assignString(patch, payload, 'specialNeedsRemarks')
  assignString(patch, payload, 'bankTransferInfo')
  assignString(patch, payload, 'payNowInfo')
  assignString(patch, payload, 'comments')

  const ordinationCertificate = stringValue(payload.ordinationCertificate ?? payload.ordinationCertificateStatus)
  if (ordinationCertificate) patch.ordinationCertificate = ordinationCertificate as Client['ordinationCertificate']

  const wellbeingIssues = wellbeingFromPayload(payload)
  if (wellbeingIssues) patch.wellbeingIssues = wellbeingIssues

  const specialNeeds = specialNeedsFromPayload(payload.specialNeeds)
  if (specialNeeds) patch.specialNeeds = specialNeeds

  return patch
}

function changedClientFields(original: Client, next: Client | undefined): Set<keyof Client> {
  const changed = new Set<keyof Client>()
  if (!next) return changed
  const fields: Array<keyof Client> = [
    'nameChn', 'nameEn', 'abbr', 'contact', 'preferredCommunication', 'whatsappEnabled',
    'preferredLanguage', 'spokenLanguage', 'addressText', 'postalCode', 'areaDistrict',
    'viharaType', 'nricNameEn', 'nricNameChn', 'nricNo', 'ordinationCertificate',
    'dateOfVerification', 'gender', 'dateOfBirth', 'age', 'maritalStatus', 'nationality',
    'ethnicity', 'dialectGroup', 'nextOfKinContact', 'buddhistTradition',
    'ordinationStatus', 'dateOfTonsure', 'countryOfTonsure', 'placeOfTonsure',
    'dateOfOrdination', 'countryOfOrdination', 'placeOfOrdination', 'ordinationYears',
    'dateJoined', 'membershipRemarks', 'comments',
  ]
  fields.forEach((field) => {
    if (String(original[field] ?? '') !== String(next[field] ?? '')) changed.add(field)
  })
  return changed
}

function parseApprovalPayload(payloadJson?: string | null): Record<string, unknown> {
  if (!payloadJson) return {}
  try {
    const parsed = JSON.parse(payloadJson)
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {}
  } catch {
    return {}
  }
}

function approvalReason(payload: Record<string, unknown>): string {
  const meta = payload._approval
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return ''
  const reason = (meta as Record<string, unknown>).reason
  return typeof reason === 'string' ? reason.trim() : ''
}

function FilterGroup({
  label,
  children,
  compact = false,
  wide = false,
}: {
  label: string
  children: ReactNode
  compact?: boolean
  wide?: boolean
}) {
  return (
    <section className={'client-filter-group' + (compact ? ' compact' : '') + (wide ? ' wide' : '')}>
      <span>{label}</span>
      <div className="client-filter-chip-row">{children}</div>
    </section>
  )
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button className={'client-filter-chip' + (active ? ' active' : '')} type="button" onClick={onClick}>
      {children}
    </button>
  )
}

function isClientApprovalType(type: string): boolean {
  return type === 'CLIENT_CREATE' || type === 'CLIENT_UPDATE' || type === 'DELETE_CLIENT' || type === 'RESTORE_CLIENT'
}

function formatDateTime(value?: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function assignString(patch: Partial<Client>, payload: Record<string, unknown>, key: keyof Client) {
  const value = stringValue(payload[key])
  if (value !== undefined) {
    ;(patch as Record<string, unknown>)[key] = value
  }
}

function assignNumber(patch: Partial<Client>, payload: Record<string, unknown>, key: keyof Client) {
  const value = payload[key]
  if (typeof value === 'number') {
    ;(patch as Record<string, unknown>)[key] = value
  } else if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
    ;(patch as Record<string, unknown>)[key] = Number(value)
  }
}

function assignBoolean(patch: Partial<Client>, payload: Record<string, unknown>, key: keyof Client) {
  const value = payload[key]
  if (typeof value === 'boolean') {
    ;(patch as Record<string, unknown>)[key] = value
  }
}

function stringValue(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  return String(value)
}

function wellbeingFromPayload(payload: Record<string, unknown>): Client['wellbeingIssues'] | undefined {
  if (payload.wellbeingIssues && typeof payload.wellbeingIssues === 'object' && !Array.isArray(payload.wellbeingIssues)) {
    return { ...emptyClientProfile().wellbeingIssues, ...(payload.wellbeingIssues as Partial<Client['wellbeingIssues']>) }
  }
  const keys = {
    physicalHealth: 'wellbeingPhysicalHealth',
    mentalHealth: 'wellbeingMentalHealth',
    socialSupport: 'wellbeingSocialSupport',
    financialStability: 'wellbeingFinancialStability',
    livingConditions: 'wellbeingLivingConditions',
    spiritual: 'wellbeingSpiritual',
    legalIssues: 'wellbeingLegalIssues',
  } as const
  if (!Object.values(keys).some((key) => typeof payload[key] === 'boolean')) return undefined
  const next = { ...emptyClientProfile().wellbeingIssues }
  Object.entries(keys).forEach(([targetKey, payloadKey]) => {
    const value = payload[payloadKey]
    if (typeof value === 'boolean') {
      next[targetKey as keyof Client['wellbeingIssues']] = value
    }
  })
  return next
}

function specialNeedsFromPayload(value: unknown): Client['specialNeeds'] | undefined {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return { ...emptyClientProfile().specialNeeds, ...(value as Partial<Client['specialNeeds']>) }
  }
  if (typeof value !== 'string') return undefined
  const normalized = value.toLowerCase()
  return {
    physical: normalized.includes('physical'),
    hearing: normalized.includes('hearing'),
    visual: normalized.includes('visual'),
    intellectual: normalized.includes('intellectual'),
  }
}

function emptyClientProfile(): Client {
  return {
    id: '',
    membershipStatus: 'ACTIVE',
    abbr: '',
    nameEn: '',
    nameChn: '',
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
    areaDistrict: '',
    dateJoined: '',
    membershipRemarks: '',
    buddhistTradition: 'Mahayana',
    ordinationStatus: '',
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

function clientToFormData(client: Client): ClientFormData {
  const { id: _id, ...form } = client
  return {
    ...form,
    ...deriveClientDateFields({
      dateOfBirth: form.dateOfBirth,
      dateOfOrdination: form.dateOfOrdination,
    }),
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
  pendingApproval?: ClientApprovalView
  approvalOperation?: ClientApprovalOperation
  changedFields: Set<keyof Client>
  canDecideApproval: boolean
  decidingApproval: boolean
  onApproveApproval: () => void
  onRejectApproval: () => void
  closed: boolean
  canUpdateClient: boolean
  canDeleteClient: boolean
  canRestoreClient: boolean
  canViewDetailedProfile: boolean
  canConvertToCase: boolean
  activeCase?: Case
  canCloseCase: boolean
  collapsed: boolean
  closeCasePending: boolean
  closingCase: boolean
  deleting: boolean
  restoring: boolean
  deleteError?: string
  restoreError?: string
  onConfirmDelete: () => void
  onRestore: () => void
  onConfirmCloseCase: () => void
  onEdit: () => void
  onCreateCase: () => void
  onViewCase: () => void
  onPrint: () => void
  onToggleCollapsed: () => void
}

function ClientProfilePanel({
  client,
  pendingApproval,
  approvalOperation,
  changedFields,
  canDecideApproval,
  decidingApproval,
  onApproveApproval,
  onRejectApproval,
  closed,
  canUpdateClient,
  canDeleteClient,
  canRestoreClient,
  canViewDetailedProfile,
  canConvertToCase,
  activeCase,
  canCloseCase,
  collapsed,
  closeCasePending,
  closingCase,
  deleting,
  restoring,
  deleteError,
  restoreError,
  onConfirmDelete,
  onRestore,
  onConfirmCloseCase,
  onEdit,
  onCreateCase,
  onViewCase,
  onPrint,
  onToggleCollapsed,
}: ClientProfilePanelProps) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  // 每个敏感区块按 clients:profile.<section> 授权单独显示(后端亦对字段真过滤)
  const canSee = (section: string) => resolve(`clients:profile.${section}`)
  const actionGroups = profileActionGroups({
    canEdit: canViewDetailedProfile && canUpdateClient,
    canConvertToCase,
    canCloseProfile: canViewDetailedProfile && canDeleteClient,
    canCloseCase: canCloseCase && Boolean(activeCase),
    closed,
  })

  return (
    <article className={'client-profile' + (closed ? ' closed' : '')}>
      <header className="client-profile-header">
        <div>
          <p className="client-profile-report-title">{t('clients.profile.printTitle')}</p>
          <div className="client-profile-title-row">
            <h1>{client.abbr || '-'}</h1>
            {closed ? <span className="client-profile-status closed">{t('clients.profile.closedStatus')}</span> : null}
          </div>
        </div>
        <div className="client-profile-header-actions">
          <button
            className="client-profile-icon-btn"
            type="button"
            aria-label={t('clients.profile.printReport')}
            title={t('clients.profile.printReport')}
            onClick={onPrint}
          >
            <span aria-hidden="true">⎙</span>
          </button>
          <button
            className="client-profile-icon-btn"
            type="button"
            aria-label={t(collapsed ? 'clients.profile.expandDetails' : 'clients.profile.collapseDetails')}
            aria-expanded={!collapsed}
            title={t(collapsed ? 'clients.profile.expandDetails' : 'clients.profile.collapseDetails')}
            onClick={onToggleCollapsed}
          >
            <span aria-hidden="true">{collapsed ? '▾' : '▴'}</span>
          </button>
        </div>
      </header>

      {collapsed ? null : (
        <>
      {deleteError ? <div className="client-profile-loading client-profile-warning">{deleteError}</div> : null}
      {restoreError ? <div className="client-profile-loading client-profile-warning">{restoreError}</div> : null}

      <ProfileSection key={`${client.id}-basicInfo`} collapsible title={t('clients.profile.section.basicInfo')}>
        <InfoCell label={t('clients.profile.field.nameChn')} value={client.nameChn} changed={changedFields.has('nameChn')} />
        <InfoCell label={t('clients.profile.field.nameEn')} value={client.nameEn} changed={changedFields.has('nameEn')} />
        <InfoCell label={t('clients.profile.field.abbr')} value={client.abbr} changed={changedFields.has('abbr')} />
        <InfoCell label={t('clients.profile.field.contact')} value={client.contact} changed={changedFields.has('contact')} />
        <InfoCell label={t('clients.profile.field.preferredComm')} value={client.preferredCommunication} changed={changedFields.has('preferredCommunication')} />
        <InfoCell label="WhatsApp" value={client.whatsappEnabled ? t('clients.profile.field.whatsappYes') : t('clients.profile.field.whatsappNo')} changed={changedFields.has('whatsappEnabled')} />
        <InfoCell label={t('clients.profile.field.prefLang')} value={client.preferredLanguage} changed={changedFields.has('preferredLanguage')} />
        <InfoCell label={t('clients.profile.field.spokenLang')} value={client.spokenLanguage} changed={changedFields.has('spokenLanguage')} />
        <InfoCell label={t('clients.profile.field.address')} value={client.addressText} changed={changedFields.has('addressText')} />
        <InfoCell label={t('clients.profile.field.postalCode')} value={client.postalCode} changed={changedFields.has('postalCode')} />
        <InfoCell label={t('clients.profile.field.areaDistrict')} value={client.areaDistrict} changed={changedFields.has('areaDistrict')} />
        <InfoCell label={t('clients.profile.field.viharaType')} value={client.viharaType} changed={changedFields.has('viharaType')} />
      </ProfileSection>

      {canSee('identity') ? (
        <ProfileSection key={`${client.id}-identity`} collapsible title={t('clients.profile.section.identity')}>
          <InfoCell label={t('clients.profile.field.nricNameEn')} value={client.nricNameEn} changed={changedFields.has('nricNameEn')} />
          <InfoCell label={t('clients.profile.field.nricNameChn')} value={client.nricNameChn} changed={changedFields.has('nricNameChn')} />
          <InfoCell label={t('clients.profile.field.nricNo')} value={client.nricNo} changed={changedFields.has('nricNo')} />
          <InfoCell label={t('clients.profile.field.ordinationCert')} value={client.ordinationCertificate} changed={changedFields.has('ordinationCertificate')} />
          <InfoCell label={t('clients.profile.field.dateVerification')} value={client.dateOfVerification} changed={changedFields.has('dateOfVerification')} />
        </ProfileSection>
      ) : null}

      {canSee('personal') ? (
        <ProfileSection key={`${client.id}-personal`} collapsible title={t('clients.profile.section.personal')}>
          <InfoCell label={t('clients.profile.field.gender')} value={client.gender} changed={changedFields.has('gender')} />
          <InfoCell label={t('clients.profile.field.dob')} value={client.dateOfBirth} changed={changedFields.has('dateOfBirth')} />
          <InfoCell label={t('clients.profile.field.age')} value={`${client.age} ${t('clients.profile.field.ageUnit')}`} changed={changedFields.has('age')} />
          <InfoCell label={t('clients.profile.field.maritalStatus')} value={client.maritalStatus} changed={changedFields.has('maritalStatus')} />
          <InfoCell label={t('clients.profile.field.nationality')} value={client.nationality} changed={changedFields.has('nationality')} />
          <InfoCell label={t('clients.profile.field.ethnicity')} value={client.ethnicity} changed={changedFields.has('ethnicity')} />
          <InfoCell label={t('clients.profile.field.dialectGroup')} value={client.dialectGroup} changed={changedFields.has('dialectGroup')} />
          <InfoCell label={t('clients.profile.field.nextOfKin')} value={client.nextOfKinContact} changed={changedFields.has('nextOfKinContact')} />
        </ProfileSection>
      ) : null}

      {canSee('ordination') ? (
        <ProfileSection key={`${client.id}-ordination`} collapsible title={t('clients.profile.section.ordination')}>
          <InfoCell label={t('clients.profile.field.buddhistTradition')} value={client.buddhistTradition} changed={changedFields.has('buddhistTradition')} />
          <InfoCell label={t('clients.profile.field.ordinationStatus')} value={client.ordinationStatus} changed={changedFields.has('ordinationStatus')} />
          <InfoCell label={t('clients.profile.field.dateTonsure')} value={client.dateOfTonsure} changed={changedFields.has('dateOfTonsure')} />
          <InfoCell label={t('clients.profile.field.placeTonsure')} value={`${client.placeOfTonsure}, ${client.countryOfTonsure}`} changed={changedFields.has('placeOfTonsure') || changedFields.has('countryOfTonsure')} />
          <InfoCell label={t('clients.profile.field.dateOrdination')} value={client.dateOfOrdination} changed={changedFields.has('dateOfOrdination')} />
          <InfoCell label={t('clients.profile.field.placeOrdination')} value={`${client.placeOfOrdination}, ${client.countryOfOrdination}`} changed={changedFields.has('placeOfOrdination') || changedFields.has('countryOfOrdination')} />
          <InfoCell label={t('clients.profile.field.ordinationYears')} value={`${client.ordinationYears} ${t('clients.profile.field.ordinationYearsUnit')}`} changed={changedFields.has('ordinationYears')} />
        </ProfileSection>
      ) : null}

      {canSee('membership') ? (
        <ProfileSection key={`${client.id}-membership`} collapsible title={t('clients.profile.section.membership')}>
          <InfoCell label={t('clients.profile.field.dateJoined')} value={client.dateJoined} changed={changedFields.has('dateJoined')} />
          <InfoCell label={t('clients.profile.field.membershipRemarks')} value={client.membershipRemarks || '-'} changed={changedFields.has('membershipRemarks')} />
          <InfoCell label={t('clients.profile.field.comments')} value={client.comments || '-'} wide changed={changedFields.has('comments')} />
        </ProfileSection>
      ) : null}

      {canSee('wellbeing') ? (
        <ProfileSection key={`${client.id}-wellbeing`} collapsible title={t('clients.profile.section.wellbeing')}>
          {(Object.keys(WELLBEING_KEYS) as WellbeingDomain[]).map((key) => (
            <InfoCell key={key} label={t(WELLBEING_KEYS[key])} value={client.wellbeingIssues[key] ? '✓' : '—'} />
          ))}
          <InfoCell label={t('clients.profile.field.wellbeingRemarks')} value={client.wellbeingRemarks || '-'} wide />
        </ProfileSection>
      ) : null}

      {canSee('needs') ? (
        <ProfileSection key={`${client.id}-needs`} collapsible title={t('clients.profile.section.needs')}>
          {(Object.keys(client.specialNeeds) as Array<keyof Client['specialNeeds']>).map((key) => (
            <InfoCell key={key} label={capitalize(key)} value={client.specialNeeds[key] ? '✓' : '—'} />
          ))}
          <InfoCell label={t('clients.profile.field.bankTransfer')} value={client.bankTransferInfo || '-'} />
          <InfoCell label={t('clients.profile.field.payNow')} value={client.payNowInfo || '-'} />
          <InfoCell label={t('clients.profile.field.specialNeedsRemarks')} value={client.specialNeedsRemarks || '-'} wide />
        </ProfileSection>
      ) : null}

      {pendingApproval ? (
        <ApprovalReviewPanel
          approval={pendingApproval}
          approvalOperation={approvalOperation}
          canDecideApproval={canDecideApproval}
          decidingApproval={decidingApproval}
          onApproveApproval={onApproveApproval}
          onRejectApproval={onRejectApproval}
        />
      ) : closed && canViewDetailedProfile && canRestoreClient ? (
        <footer className="client-profile-action-footer split">
          <div className="client-profile-secondary-actions" />
          <div className="client-profile-primary-actions">
            <button className="btn-primary" type="button" disabled={restoring} onClick={onRestore}>
              {restoring ? t('common.saving') : t('clients.profile.restoreProfile')}
            </button>
          </div>
        </footer>
      ) : actionGroups.primary.length || actionGroups.secondary.length || activeCase ? (
        <footer className="client-profile-action-footer split">
          <div className="client-profile-secondary-actions">
            {actionGroups.secondary.includes('convertToCase') ? (
              <button className="btn-secondary client-subtle-action" type="button" onClick={onCreateCase}>
                {t('clients.profile.convertToCase')}
              </button>
            ) : null}
            {actionGroups.secondary.includes('closeCase') ? (
              <button className="btn-secondary client-subtle-action" type="button" disabled={closingCase || closeCasePending} onClick={onConfirmCloseCase}>
                {closingCase ? t('common.saving') : closeCasePending ? t('clients.profile.closeCasePending') : t('clients.profile.closeCase')}
              </button>
            ) : null}
            {actionGroups.secondary.includes('closeProfile') ? (
              <button className="btn-secondary client-subtle-action" type="button" disabled={deleting} onClick={onConfirmDelete}>
                {deleting ? t('common.saving') : t('clients.profile.delete')}
              </button>
            ) : null}
          </div>
          <div className="client-profile-primary-actions">
            {activeCase ? (
              <button className="client-profile-case-link" type="button" onClick={onViewCase}>
                <span className="client-profile-case-link-label">{t('clients.profile.viewCase')}</span>
                <span className="client-profile-case-link-no">{activeCase.caseNo}</span>
                <span aria-hidden="true" className="client-profile-case-link-arrow">→</span>
              </button>
            ) : null}
            {actionGroups.primary.includes('editProfile') ? (
              <button className="btn-edit" type="button" onClick={onEdit}>
                {t('clients.profile.editProfile')}
              </button>
            ) : null}
          </div>
        </footer>
      ) : null}
        </>
      )}
    </article>
  )
}

function ApprovalReviewPanel({
  approval,
  approvalOperation,
  canDecideApproval,
  decidingApproval,
  onApproveApproval,
  onRejectApproval,
}: {
  approval: ClientApprovalView
  approvalOperation?: ClientApprovalOperation
  canDecideApproval: boolean
  decidingApproval: boolean
  onApproveApproval: () => void
  onRejectApproval: () => void
}) {
  const { t } = useTranslation()
  const payload = parseApprovalPayload(approval.payloadJson)

  return (
    <section className={`client-approval-review ${approvalOperation ?? ''}`}>
      <div className="client-approval-review-header">
        <div>
          <strong>{t(`clients.approvals.type.${approval.type}`, { defaultValue: approval.type })}</strong>
          <span>{approval.requestedByName ?? '-'} · {formatDateTime(approval.createdAt)}</span>
        </div>
        {approvalOperation ? (
          <span className={`client-approval-status ${approvalOperation}`}>
            {t(`clients.approvals.badge.${approvalOperation}`)}
          </span>
        ) : null}
      </div>

      <div className="client-approval-reason">
        <strong>{t('clients.approvals.reason')}</strong>
        <p>{approvalReason(payload) || t('clients.approvals.noReason')}</p>
      </div>

      {canDecideApproval ? (
        <div className="client-approval-actions">
          <button className="btn-secondary" type="button" disabled={decidingApproval} onClick={onRejectApproval}>
            {t('approvals.reject')}
          </button>
          <button className="btn-primary" type="button" disabled={decidingApproval} onClick={onApproveApproval}>
            {t('approvals.approve')}
          </button>
        </div>
      ) : null}
    </section>
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
            <h1>{form.abbr || client.abbr || '-'}</h1>
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
            <TextField label={t('clients.profile.field.age')} type="number" value={String(form.age)} readOnly onChange={() => undefined} />
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
            <TextField label={t('clients.profile.field.ordinationYears')} type="number" value={String(form.ordinationYears)} readOnly onChange={() => undefined} />
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

function ProfileSection({ title, children, collapsible = false }: { title: string; children: ReactNode; collapsible?: boolean }) {
  if (collapsible) {
    // 查看态:每个部分独立折叠,默认折叠(不加 open)。编辑态仍走下方展开的 <section>。
    return (
      <details className="client-profile-section client-profile-section-collapsible">
        <summary>
          <h3>{title}</h3>
        </summary>
        <div className="client-profile-grid">{children}</div>
      </details>
    )
  }
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
  changed = false,
}: {
  label: string
  value: string | number
  wide?: boolean
  changed?: boolean
}) {
  const displayValue = String(value ?? '').trim() || '-'

  return (
    <div className={'client-info-cell' + (wide ? ' wide' : '') + (changed ? ' changed' : '')}>
      <span>{label}</span>
      <strong>{displayValue}</strong>
    </div>
  )
}

function buildNewClientPayload(form: NewClientForm): Omit<Client, 'id'> {
  const today = new Date().toISOString().slice(0, 10)

  return {
    membershipStatus: 'ACTIVE',
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
