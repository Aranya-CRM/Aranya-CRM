import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { useAccess } from '../../../shared/auth'
import { ApprovalConfirmModal, BackButton, PageHeader } from '../../../shared/ui'
import {
  ClientFormStepContent,
  ClientWizardFooter,
  ClientWizardSteps,
  type ClientFormData,
  type SpecialNeedKey,
} from '../components'
import { isClientResult, useClient, useCreateClient, useUpdateClient } from '../hooks'
import type { Client, WellbeingDomain } from '../types'
import './clients.css'

const EMPTY_WELLBEING: Record<WellbeingDomain, boolean> = {
  physicalHealth: false,
  mentalHealth: false,
  socialSupport: false,
  financialStability: false,
  livingConditions: false,
  spiritual: false,
  legalIssues: false,
}

const EMPTY_SPECIAL_NEEDS: Record<SpecialNeedKey, boolean> = {
  physical: false,
  hearing: false,
  visual: false,
  intellectual: false,
}

function emptyClient(): ClientFormData {
  return {
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
    buddhistTradition: 'Theravada',
    ordinationStatus: 'Bhikkhu',
    dateOfTonsure: '',
    countryOfTonsure: '',
    placeOfTonsure: '',
    dateOfOrdination: '',
    countryOfOrdination: '',
    placeOfOrdination: '',
    ordinationYears: 0,
    ordinationCertificate: 'Incomplete',
    dateOfVerification: '',
    wellbeingIssues: { ...EMPTY_WELLBEING },
    wellbeingRemarks: '',
    specialNeeds: { ...EMPTY_SPECIAL_NEEDS },
    specialNeedsRemarks: '',
    bankTransferInfo: '',
    payNowInfo: '',
    comments: '',
  }
}

export function ClientFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { resolve } = useAccess()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ClientFormData>(emptyClient())
  const [showApprovalConfirm, setShowApprovalConfirm] = useState(false)
  const { data: client, isLoading } = useClient(id)
  const createClientMutation = useCreateClient()
  const updateClientMutation = useUpdateClient()
  const canWriteClient = isEdit ? resolve('clients:update') : resolve('clients:create')

  useEffect(() => {
    if (client) {
      const rest = { ...client }
      delete (rest as Partial<Client>).id
      setForm(rest)
    }
  }, [client])

  if (!canWriteClient) {
    return (
      <>
        <PageHeader title={t('clients.accessDenied')} />
        <p className="access-denied-copy">{t('clients.accessDeniedMsg')}</p>
      </>
    )
  }

  if (isEdit && isLoading) {
    return <PageHeader title={t('common.loading')} />
  }

  function updateField<K extends keyof ClientFormData>(key: K, value: ClientFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleWellbeing(key: WellbeingDomain) {
    setForm((prev) => ({
      ...prev,
      wellbeingIssues: { ...prev.wellbeingIssues, [key]: !prev.wellbeingIssues[key] },
    }))
  }

  function toggleSpecialNeed(key: SpecialNeedKey) {
    setForm((prev) => ({
      ...prev,
      specialNeeds: { ...prev.specialNeeds, [key]: !prev.specialNeeds[key] },
    }))
  }

  function handleSubmit() {
    setShowApprovalConfirm(true)
  }

  async function submitApproval() {
    try {
      const result = isEdit && id
        ? await updateClientMutation.mutateAsync({ id, data: form as Partial<Client> })
        : await createClientMutation.mutateAsync(form)
      setShowApprovalConfirm(false)
      if (isEdit && id) {
        if (isClientResult(result)) {
          navigate(`/clients/${result.id}`)
        } else {
          alert(t('clients.approvalSubmittedWithId', { id: result.id }))
          navigate(`/clients/${id}`)
        }
      } else {
        if (isClientResult(result)) {
          navigate(`/clients/${result.id}`)
        } else {
          alert(t('clients.approvalSubmittedWithId', { id: result.id }))
          navigate('/clients')
        }
      }
    } catch {
      alert(t('clients.saveError'))
    }
  }

  const saving = createClientMutation.isPending || updateClientMutation.isPending

  return (
    <>
      <BackButton onClick={() => navigate('/clients')} />

      <div className="client-form-header">
        <PageHeader title={isEdit ? t('clients.form.editTitle') : t('clients.form.newTitle')} />
      </div>

      <ClientWizardSteps step={step} onStepChange={setStep} />

      <ClientFormStepContent
        step={step}
        form={form}
        updateField={updateField}
        toggleWellbeing={toggleWellbeing}
        toggleSpecialNeed={toggleSpecialNeed}
      />

      <ClientWizardFooter
        step={step}
        isEdit={isEdit}
        saving={saving}
        onPrevious={() => setStep((current) => current - 1)}
        onNext={() => setStep((current) => current + 1)}
        onSubmit={handleSubmit}
      />

      <ApprovalConfirmModal
        open={showApprovalConfirm}
        title={t('approvalConfirm.title')}
        message={t(isEdit ? 'approvalConfirm.clientUpdate' : 'approvalConfirm.clientCreate')}
        confirmLabel={saving ? t('common.saving') : t('approvalConfirm.confirm')}
        cancelLabel={t('approvalConfirm.cancel')}
        pending={saving}
        onCancel={() => setShowApprovalConfirm(false)}
        onConfirm={() => void submitApproval()}
      />
    </>
  )
}
