import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { createClient, fetchClientById, updateClient } from '../../services/client.api'
import type { Client, WellbeingDomain } from '../../types/client'
import './clients.css'

const STEPS = [
  { zh: '基本信息', en: 'Basic Info' },
  { zh: '身份文件', en: 'Identity' },
  { zh: '个人信息', en: 'Personal' },
  { zh: '受戒历史', en: 'Ordination' },
  { zh: '健康评估', en: 'Wellbeing' },
  { zh: '特殊需求 & 备注', en: 'Needs & Notes' },
]

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

const EMPTY_SPECIAL_NEEDS = { physical: false, hearing: false, visual: false, intellectual: false }

function emptyClient(): Omit<Client, 'id'> {
  return {
    abbr: '', nameEn: '', nameChn: '',
    nricNameEn: '', nricNameChn: '', nricNo: '',
    sex: 'Male', dateOfBirth: '', age: 0,
    maritalStatus: 'Never married',
    nationality: '', ethnicity: '', dialectGroup: '',
    contact: '', nextOfKin: '',
    preferredCommunication: 'Phone Call',
    ableToUseWhatsApp: false,
    preferredLanguage: '', spokenLanguage: '',
    address: '', postalCode: '', viharaType: '', area: '',
    membershipStatus: 'Active', dateJoined: '', membershipRemarks: '',
    buddhistTradition: 'Theravada',
    ordinationStatus: 'Bhikkhu',
    dateTonsure: '', countryTonsure: '', placeTonsure: '',
    dateOrdination: '', countryOrdination: '', placeOrdination: '',
    ordinationYears: 0,
    ordinationCertificate: 'Incomplete', dateVerification: '',
    wellbeingIssues: { ...EMPTY_WELLBEING },
    wellbeingRemarks: '',
    specialNeeds: { ...EMPTY_SPECIAL_NEEDS },
    specialNeedsRemarks: '',
    bankTransfer: false, payNow: false, comments: '',
  }
}

export function ClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const isEdit = Boolean(id)
  const { canFeature } = useAuth()
  const navigate = useNavigate()

  const [step, setStep] = useState(0)
  const [form, setForm] = useState<Omit<Client, 'id'>>(emptyClient())
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
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id])

  if (!canWriteClient) {
    return (
      <>
        <h2 className="page-title">权限不足</h2>
        <div className="page-subtitle">Access Denied</div>
        <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: 13 }}>
          当前账户不可创建或编辑僧人档案。 / Your current access does not allow creating or editing client profiles.
        </p>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <h2 className="page-title">加载中...</h2>
        <div className="page-subtitle">Loading...</div>
      </>
    )
  }

  function updateField<K extends keyof Omit<Client, 'id'>>(key: K, value: Omit<Client, 'id'>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function toggleWellbeing(key: WellbeingDomain) {
    setForm((prev) => ({
      ...prev,
      wellbeingIssues: { ...prev.wellbeingIssues, [key]: !prev.wellbeingIssues[key] },
    }))
  }

  function toggleSpecialNeed(key: keyof typeof EMPTY_SPECIAL_NEEDS) {
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
      <button className="back-link" type="button" onClick={() => navigate('/clients')}>
        ← 返回列表 / Back to List
      </button>

      <h2 className="page-title" style={{ marginTop: 8 }}>
        {isEdit ? '编辑僧人档案' : '新建僧人档案'}
      </h2>
      <div className="page-subtitle">{isEdit ? 'Edit Client' : 'New Client'}</div>

      <div className="wizard-steps">
        {STEPS.map((s, i) => (
          <button
            key={i}
            className={'wizard-step' + (i === step ? ' active' : '') + (i < step ? ' completed' : '')}
            type="button"
            onClick={() => setStep(i)}
          >
            {i + 1}. {s.zh}
          </button>
        ))}
      </div>

      {/* Step 0: Basic Info */}
      {step === 0 && (
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">法名 (中) / Chinese Name *</label>
            <input className="form-input" value={form.nameChn} onChange={(e) => updateField('nameChn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">法名 (英) / English Name *</label>
            <input className="form-input" value={form.nameEn} onChange={(e) => updateField('nameEn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">缩写 / Abbreviation *</label>
            <input className="form-input" value={form.abbr} onChange={(e) => updateField('abbr', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">联系电话 / Contact</label>
            <input className="form-input" value={form.contact} onChange={(e) => updateField('contact', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">首选联系方式 / Preferred Communication</label>
            <select className="form-select" value={form.preferredCommunication} onChange={(e) => updateField('preferredCommunication', e.target.value as Client['preferredCommunication'])}>
              <option value="WhatsApp Msg">WhatsApp Msg</option>
              <option value="WhatsApp Audio">WhatsApp Audio</option>
              <option value="Phone Call">Phone Call</option>
              <option value="Home Visit">Home Visit</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">WhatsApp 使用能力</label>
            <div className="form-checkbox-row">
              <input type="checkbox" checked={form.ableToUseWhatsApp} onChange={(e) => updateField('ableToUseWhatsApp', e.target.checked)} />
              <span>可以使用 WhatsApp / Able to use WhatsApp</span>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">首选语言 / Preferred Language</label>
            <input className="form-input" value={form.preferredLanguage} onChange={(e) => updateField('preferredLanguage', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">口语 / Spoken Languages</label>
            <input className="form-input" value={form.spokenLanguage} onChange={(e) => updateField('spokenLanguage', e.target.value)} />
          </div>
          <div className="form-group full-width">
            <label className="form-label">地址 / Address</label>
            <input className="form-input" value={form.address} onChange={(e) => updateField('address', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">邮编 / Postal Code</label>
            <input className="form-input" value={form.postalCode} onChange={(e) => updateField('postalCode', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">区域 / Area</label>
            <input className="form-input" value={form.area} onChange={(e) => updateField('area', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 1: Identity */}
      {step === 1 && (
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">NRIC 姓名 (英) / NRIC Name (EN)</label>
            <input className="form-input" value={form.nricNameEn} onChange={(e) => updateField('nricNameEn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">NRIC 姓名 (中) / NRIC Name (CN)</label>
            <input className="form-input" value={form.nricNameChn} onChange={(e) => updateField('nricNameChn', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">NRIC 号码 / NRIC No.</label>
            <input className="form-input" value={form.nricNo} onChange={(e) => updateField('nricNo', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">受戒证书 / Ordination Certificate</label>
            <select className="form-select" value={form.ordinationCertificate} onChange={(e) => updateField('ordinationCertificate', e.target.value as Client['ordinationCertificate'])}>
              <option value="Completed">Completed</option>
              <option value="Incomplete">Incomplete</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">验证日期 / Date of Verification</label>
            <input className="form-input" type="date" value={form.dateVerification} onChange={(e) => updateField('dateVerification', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 2: Personal */}
      {step === 2 && (
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">性别 / Sex</label>
            <select className="form-select" value={form.sex} onChange={(e) => updateField('sex', e.target.value as Client['sex'])}>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">出生日期 / Date of Birth</label>
            <input className="form-input" type="date" value={form.dateOfBirth} onChange={(e) => updateField('dateOfBirth', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">年龄 / Age</label>
            <input className="form-input" type="number" value={form.age} onChange={(e) => updateField('age', Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">婚姻状况 / Marital Status</label>
            <select className="form-select" value={form.maritalStatus} onChange={(e) => updateField('maritalStatus', e.target.value as Client['maritalStatus'])}>
              <option value="Never married">Never married</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Separated">Separated</option>
              <option value="Widowed">Widowed</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">国籍 / Nationality</label>
            <input className="form-input" value={form.nationality} onChange={(e) => updateField('nationality', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">族裔 / Ethnicity</label>
            <input className="form-input" value={form.ethnicity} onChange={(e) => updateField('ethnicity', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">方言 / Dialect Group</label>
            <input className="form-input" value={form.dialectGroup} onChange={(e) => updateField('dialectGroup', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">精舍类型 / Vihara Type</label>
            <input className="form-input" value={form.viharaType} onChange={(e) => updateField('viharaType', e.target.value)} />
          </div>
          <div className="form-group full-width">
            <label className="form-label">近亲 / Next of Kin</label>
            <input className="form-input" value={form.nextOfKin} onChange={(e) => updateField('nextOfKin', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">会员状态 / Membership Status</label>
            <select className="form-select" value={form.membershipStatus} onChange={(e) => updateField('membershipStatus', e.target.value as Client['membershipStatus'])}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discharged">Discharged</option>
              <option value="Withdrawn">Withdrawn</option>
              <option value="Deceased">Deceased</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">加入日期 / Date Joined</label>
            <input className="form-input" type="date" value={form.dateJoined} onChange={(e) => updateField('dateJoined', e.target.value)} />
          </div>
          <div className="form-group full-width">
            <label className="form-label">会员备注 / Membership Remarks</label>
            <textarea className="form-textarea" value={form.membershipRemarks} onChange={(e) => updateField('membershipRemarks', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 3: Ordination */}
      {step === 3 && (
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">佛教传承 / Buddhist Tradition</label>
            <select className="form-select" value={form.buddhistTradition} onChange={(e) => updateField('buddhistTradition', e.target.value as Client['buddhistTradition'])}>
              <option value="Theravada">Theravada</option>
              <option value="Mahayana">Mahayana</option>
              <option value="Vajrayana">Vajrayana</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">戒别 / Ordination Status</label>
            <select className="form-select" value={form.ordinationStatus} onChange={(e) => updateField('ordinationStatus', e.target.value as Client['ordinationStatus'])}>
              <option value="Bhikkhu">Bhikkhu</option>
              <option value="Bhikkhuni">Bhikkhuni</option>
              <option value="Samanera">Samanera</option>
              <option value="Sikkhamana">Sikkhamana</option>
              <option value="Sayalay">Sayalay</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">剃度日期 / Date of Tonsure</label>
            <input className="form-input" type="date" value={form.dateTonsure} onChange={(e) => updateField('dateTonsure', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">剃度国家 / Country of Tonsure</label>
            <input className="form-input" value={form.countryTonsure} onChange={(e) => updateField('countryTonsure', e.target.value)} />
          </div>
          <div className="form-group full-width">
            <label className="form-label">剃度地点 / Place of Tonsure</label>
            <input className="form-input" value={form.placeTonsure} onChange={(e) => updateField('placeTonsure', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">受戒日期 / Date of Ordination</label>
            <input className="form-input" type="date" value={form.dateOrdination} onChange={(e) => updateField('dateOrdination', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">受戒国家 / Country of Ordination</label>
            <input className="form-input" value={form.countryOrdination} onChange={(e) => updateField('countryOrdination', e.target.value)} />
          </div>
          <div className="form-group full-width">
            <label className="form-label">受戒地点 / Place of Ordination</label>
            <input className="form-input" value={form.placeOrdination} onChange={(e) => updateField('placeOrdination', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">戒龄 / Ordination Years</label>
            <input className="form-input" type="number" value={form.ordinationYears} onChange={(e) => updateField('ordinationYears', Number(e.target.value))} />
          </div>
        </div>
      )}

      {/* Step 4: Wellbeing */}
      {step === 4 && (
        <div>
          <div className="info-section-title">健康评估 / Wellbeing Issues</div>
          <div className="form-grid">
            {(Object.keys(EMPTY_WELLBEING) as WellbeingDomain[]).map((key) => (
              <div key={key} className="form-group">
                <div className="form-checkbox-row">
                  <input type="checkbox" checked={form.wellbeingIssues[key]} onChange={() => toggleWellbeing(key)} />
                  <span>{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="form-group full-width" style={{ marginTop: 16 }}>
            <label className="form-label">健康备注 / Wellbeing Remarks</label>
            <textarea className="form-textarea" value={form.wellbeingRemarks} onChange={(e) => updateField('wellbeingRemarks', e.target.value)} />
          </div>
        </div>
      )}

      {/* Step 5: Special Needs & Notes */}
      {step === 5 && (
        <div>
          <div className="info-section-title">特殊需求 / Special Needs</div>
          <div className="form-grid">
            {(Object.keys(EMPTY_SPECIAL_NEEDS) as (keyof typeof EMPTY_SPECIAL_NEEDS)[]).map((key) => (
              <div key={key} className="form-group">
                <div className="form-checkbox-row">
                  <input type="checkbox" checked={form.specialNeeds[key]} onChange={() => toggleSpecialNeed(key)} />
                  <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="form-group full-width" style={{ marginTop: 16 }}>
            <label className="form-label">特殊需求备注 / Special Needs Remarks</label>
            <textarea className="form-textarea" value={form.specialNeedsRemarks} onChange={(e) => updateField('specialNeedsRemarks', e.target.value)} />
          </div>

          <div className="info-section-title">财务信息 / Financial</div>
          <div className="form-grid">
            <div className="form-group">
              <div className="form-checkbox-row">
                <input type="checkbox" checked={form.bankTransfer} onChange={(e) => updateField('bankTransfer', e.target.checked)} />
                <span>银行转账 / Bank Transfer</span>
              </div>
            </div>
            <div className="form-group">
              <div className="form-checkbox-row">
                <input type="checkbox" checked={form.payNow} onChange={(e) => updateField('payNow', e.target.checked)} />
                <span>PayNow</span>
              </div>
            </div>
          </div>

          <div className="form-group full-width" style={{ marginTop: 16 }}>
            <label className="form-label">备注 / Comments</label>
            <textarea className="form-textarea" value={form.comments} onChange={(e) => updateField('comments', e.target.value)} />
          </div>
        </div>
      )}

      <div className="wizard-footer">
        <div className="wizard-footer-left">
          {step > 0 && (
            <button className="btn-secondary" type="button" onClick={() => setStep(step - 1)}>
              ← 上一步 / Previous
            </button>
          )}
        </div>
        <div className="wizard-footer-right">
          {step < STEPS.length - 1 ? (
            <button className="btn-primary" type="button" onClick={() => setStep(step + 1)}>
              下一步 / Next →
            </button>
          ) : (
            <button className="btn-primary" type="button" disabled={saving} onClick={handleSubmit}>
              {saving ? '保存中... / Saving...' : (isEdit ? '保存修改 / Save Changes' : '提交 / Submit')}
            </button>
          )}
        </div>
      </div>
    </>
  )
}
