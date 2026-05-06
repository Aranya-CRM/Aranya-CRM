import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createClient, fetchClientById, updateClient } from '../../services/client.api'
import type { Client, WellbeingDomain } from '../../types/client'
import { BackButton, PageHeader } from '../../shared/ui'
import { useAccess } from '../../shared/auth'
import {
  ClientFormStepContent,
  ClientWizardFooter,
  ClientWizardSteps,
  type ClientFormData,
  type SpecialNeedKey,
} from '../../features/clients/components'
import './clients.css'

const EMPTY_WELLBEING: Record<WellbeingDomain, boolean> = {
  physicalHealth: false,
  mentalHealth: false,
  socialSupport: false,
  financialStability: false,
  livingConditions: false,
  spiritualWellbeing: false,
  legalIssues: false,
  substanceUse: false,
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
    area: '',
    membershipStatus: 'Active',
    dateJoined: '',
    membershipRemarks: '',
    buddhistTradition: 'Theravada',
    ordinationStatus: 'Bhikkhu',
    dateTonsure: '',
    countryTonsure: '',
    placeTonsure: '',
    dateOrdination: '',
    countryOrdination: '',
    placeOrdination: '',
    ordinationYears: 0,
    ordinationCertificate: 'Incomplete',
    dateVerification: '',
    wellbeingIssues: { ...EMPTY_WELLBEING },
    wellbeingRemarks: '',
    specialNeeds: { ...EMPTY_SPECIAL_NEEDS },
    specialNeedsRemarks: '',
    bankTransfer: false,
    payNow: false,
    comments: '',
  }
}

export function ClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { canFeature } = useAccess()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<ClientFormData>(emptyClient())
  const [loading, setLoading] = useState(isEdit)
  const [saving, setSaving] = useState(false)
  const canWriteClient = isEdit ? canFeature('clients.update') : canFeature('clients.create')

  useEffect(() => {
    if (!id) return

    let active = true

    async function load() {
      try {
        const data = await fetchClientById(id!)
        if (active && data) {
          const { id: _removed, ...rest } = data
          setForm(rest)
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

  if (!canWriteClient) {
    return (
      <>
        <PageHeader titleZh="权限不足" titleEn="Access Denied" />
        <p className="access-denied-copy">
          当前账户不可创建或编辑僧人档案。 / Your current access does not allow creating or editing client profiles.
        </p>
      </>
    )
  }

  if (loading) {
    return <PageHeader titleZh="加载中..." titleEn="Loading..." />
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

  async function handleSubmit() {
    setSaving(true)
    try {
      if (isEdit && id) {
        await updateClient(id, form as Partial<Client>)
      } else {
        await createClient(form)
      }
      navigate('/clients')
    } catch {
      alert('保存失败 / Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <BackButton onClick={() => navigate('/clients')}>← 返回列表 / Back to List</BackButton>

      <div className="client-form-header">
        <PageHeader
          titleZh={isEdit ? '编辑僧人档案' : '新建僧人档案'}
          titleEn={isEdit ? 'Edit Client' : 'New Client'}
        />
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
    </>
  )
}
