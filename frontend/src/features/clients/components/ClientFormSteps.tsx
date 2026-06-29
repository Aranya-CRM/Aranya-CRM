import type { Client, WellbeingDomain } from '../types'
import { CheckboxRow, SelectField, TextareaField, TextField } from '../../../shared/ui/form'
import { deriveClientDateFields } from '../pages/clientProfileUtils'

export type ClientFormData = Omit<Client, 'id'>
export type ClientFormFieldUpdater = <K extends keyof ClientFormData>(
  key: K,
  value: ClientFormData[K],
) => void
export type SpecialNeedKey = keyof Client['specialNeeds']

export const CLIENT_FORM_STEPS = [
  { zh: '基本信息', en: 'Basic Info' },
  { zh: '身份文件', en: 'Identity' },
  { zh: '个人信息', en: 'Personal' },
  { zh: '受戒历史', en: 'Ordination' },
  { zh: '健康评估', en: 'Wellbeing' },
  { zh: '特殊需求 & 备注', en: 'Needs & Notes' },
]

interface ClientWizardStepsProps {
  step: number
  onStepChange: (step: number) => void
}

export function ClientWizardSteps({ step, onStepChange }: ClientWizardStepsProps) {
  return (
    <div className="wizard-steps">
      {CLIENT_FORM_STEPS.map((item, index) => (
        <button
          key={item.en}
          className={'wizard-step' + (index === step ? ' active' : '') + (index < step ? ' completed' : '')}
          type="button"
          onClick={() => onStepChange(index)}
        >
          {index + 1}. {item.zh}
        </button>
      ))}
    </div>
  )
}

interface ClientFormStepContentProps {
  step: number
  form: ClientFormData
  updateField: ClientFormFieldUpdater
  toggleWellbeing: (key: WellbeingDomain) => void
  toggleSpecialNeed: (key: SpecialNeedKey) => void
}

export function ClientFormStepContent({
  step,
  form,
  updateField,
  toggleWellbeing,
  toggleSpecialNeed,
}: ClientFormStepContentProps) {
  if (step === 0) {
    return <BasicInfoStep form={form} updateField={updateField} />
  }

  if (step === 1) {
    return <IdentityStep form={form} updateField={updateField} />
  }

  if (step === 2) {
    return <PersonalStep form={form} updateField={updateField} />
  }

  if (step === 3) {
    return <OrdinationStep form={form} updateField={updateField} />
  }

  if (step === 4) {
    return (
      <WellbeingStep
        form={form}
        updateField={updateField}
        toggleWellbeing={toggleWellbeing}
      />
    )
  }

  return (
    <NeedsAndNotesStep
      form={form}
      updateField={updateField}
      toggleSpecialNeed={toggleSpecialNeed}
    />
  )
}

interface ClientWizardFooterProps {
  step: number
  isEdit: boolean
  saving: boolean
  onPrevious: () => void
  onNext: () => void
  onSubmit: () => void
}

export function ClientWizardFooter({
  step,
  isEdit,
  saving,
  onPrevious,
  onNext,
  onSubmit,
}: ClientWizardFooterProps) {
  const isLastStep = step === CLIENT_FORM_STEPS.length - 1

  return (
    <div className="wizard-footer">
      <div className="wizard-footer-left">
        {step > 0 ? (
          <button className="btn-secondary" type="button" onClick={onPrevious}>
            ← 上一步 / Previous
          </button>
        ) : null}
      </div>
      <div className="wizard-footer-right">
        {!isLastStep ? (
          <button className="btn-primary" type="button" onClick={onNext}>
            下一步 / Next →
          </button>
        ) : (
          <button className="btn-primary" type="button" disabled={saving} onClick={onSubmit}>
            {saving ? '保存中... / Saving...' : isEdit ? '保存修改 / Save Changes' : '提交 / Submit'}
          </button>
        )}
      </div>
    </div>
  )
}

interface StepProps {
  form: ClientFormData
  updateField: ClientFormFieldUpdater
}

function BasicInfoStep({ form, updateField }: StepProps) {
  return (
    <div className="form-grid">
      <TextField label="法名 (中) / Chinese Name *" value={form.nameChn} onChange={(value) => updateField('nameChn', value)} />
      <TextField label="法名 (英) / English Name *" value={form.nameEn} onChange={(value) => updateField('nameEn', value)} />
      <TextField label="缩写 / Abbreviation *" value={form.abbr} onChange={(value) => updateField('abbr', value)} />
      <TextField label="联系电话 / Contact" value={form.contact} onChange={(value) => updateField('contact', value)} />
      <SelectField
        label="首选联系方式 / Preferred Communication"
        value={form.preferredCommunication}
        options={['WhatsApp Msg', 'WhatsApp Audio', 'Phone Call', 'Home Visit']}
        onChange={(value) => updateField('preferredCommunication', value as Client['preferredCommunication'])}
      />
      <div className="form-group">
        <label className="form-label">WhatsApp 使用能力</label>
        <CheckboxRow
          checked={form.whatsappEnabled}
          label="可以使用 WhatsApp / WhatsApp Enabled"
          onChange={(checked) => updateField('whatsappEnabled', checked)}
        />
      </div>
      <TextField label="首选语言 / Preferred Language" value={form.preferredLanguage} onChange={(value) => updateField('preferredLanguage', value)} />
      <TextField label="口语 / Spoken Languages" value={form.spokenLanguage} onChange={(value) => updateField('spokenLanguage', value)} />
      <TextField label="地址 / Address" value={form.addressText} onChange={(value) => updateField('addressText', value)} fullWidth />
      <TextField label="邮编 / Postal Code" value={form.postalCode} onChange={(value) => updateField('postalCode', value)} />
      <TextField label="区域 / Area / District" value={form.areaDistrict} onChange={(value) => updateField('areaDistrict', value)} />
    </div>
  )
}

function IdentityStep({ form, updateField }: StepProps) {
  return (
    <div className="form-grid">
      <TextField label="NRIC 姓名 (英) / NRIC Name (EN)" value={form.nricNameEn} onChange={(value) => updateField('nricNameEn', value)} />
      <TextField label="NRIC 姓名 (中) / NRIC Name (CN)" value={form.nricNameChn} onChange={(value) => updateField('nricNameChn', value)} />
      <TextField label="NRIC 号码 / NRIC No." value={form.nricNo} onChange={(value) => updateField('nricNo', value)} />
      <SelectField
        label="受戒证书 / Ordination Certificate"
        value={form.ordinationCertificate}
        options={['Completed', 'Incomplete']}
        onChange={(value) => updateField('ordinationCertificate', value as Client['ordinationCertificate'])}
      />
      <TextField label="验证日期 / Date of Verification" type="date" value={form.dateOfVerification} onChange={(value) => updateField('dateOfVerification', value)} />
    </div>
  )
}

function PersonalStep({ form, updateField }: StepProps) {
  function updateDateOfBirth(value: string) {
    updateField('dateOfBirth', value)
    updateField('age', deriveClientDateFields({ ...form, dateOfBirth: value }).age)
  }

  return (
    <div className="form-grid">
      <SelectField
        label="性别 / Gender"
        value={form.gender}
        options={['Male', 'Female']}
        onChange={(value) => updateField('gender', value as Client['gender'])}
      />
      <TextField label="出生日期 / Date of Birth" type="date" value={form.dateOfBirth} onChange={updateDateOfBirth} />
      <TextField label="年龄 / Age" type="number" value={String(form.age)} readOnly onChange={() => undefined} />
      <SelectField
        label="婚姻状况 / Marital Status"
        value={form.maritalStatus}
        options={['Never married', 'Married', 'Divorced', 'Separated', 'Widowed']}
        onChange={(value) => updateField('maritalStatus', value as Client['maritalStatus'])}
      />
      <TextField label="国籍 / Nationality" value={form.nationality} onChange={(value) => updateField('nationality', value)} />
      <TextField label="族裔 / Ethnicity" value={form.ethnicity} onChange={(value) => updateField('ethnicity', value)} />
      <TextField label="方言 / Dialect Group" value={form.dialectGroup} onChange={(value) => updateField('dialectGroup', value)} />
      <TextField label="精舍类型 / Vihara Type" value={form.viharaType} onChange={(value) => updateField('viharaType', value)} />
      <TextField label="近亲联系人 / Next of Kin Contact" value={form.nextOfKinContact} onChange={(value) => updateField('nextOfKinContact', value)} fullWidth />
      <TextField label="加入日期 / Date Joined" type="date" value={form.dateJoined} onChange={(value) => updateField('dateJoined', value)} />
      <TextareaField label="会员备注 / Membership Remarks" value={form.membershipRemarks} onChange={(value) => updateField('membershipRemarks', value)} fullWidth />
    </div>
  )
}

function OrdinationStep({ form, updateField }: StepProps) {
  function updateDateOfOrdination(value: string) {
    updateField('dateOfOrdination', value)
    updateField('ordinationYears', deriveClientDateFields({ ...form, dateOfOrdination: value }).ordinationYears)
  }

  return (
    <div className="form-grid">
      <SelectField
        label="佛教传统 / Buddhist Tradition"
        value={form.buddhistTradition}
        options={['Theravada', 'Mahayana', 'Vajrayana']}
        onChange={(value) => updateField('buddhistTradition', value as Client['buddhistTradition'])}
      />
      <SelectField
        label="戒别 / Ordination Status"
        value={form.ordinationStatus}
        options={['Bhikkhu', 'Bhikkhuni', 'Samanera', 'Samaneri', 'Sikkhamana', 'Sayalay']}
        onChange={(value) => updateField('ordinationStatus', value as Client['ordinationStatus'])}
      />
      <TextField label="剃度日期 / Date of Tonsure" type="date" value={form.dateOfTonsure} onChange={(value) => updateField('dateOfTonsure', value)} />
      <TextField label="剃度国家 / Country of Tonsure" value={form.countryOfTonsure} onChange={(value) => updateField('countryOfTonsure', value)} />
      <TextField label="剃度地点 / Place of Tonsure" value={form.placeOfTonsure} onChange={(value) => updateField('placeOfTonsure', value)} fullWidth />
      <TextField label="受戒日期 / Date of Ordination" type="date" value={form.dateOfOrdination} onChange={updateDateOfOrdination} />
      <TextField label="受戒国家 / Country of Ordination" value={form.countryOfOrdination} onChange={(value) => updateField('countryOfOrdination', value)} />
      <TextField label="受戒地点 / Place of Ordination" value={form.placeOfOrdination} onChange={(value) => updateField('placeOfOrdination', value)} fullWidth />
      <TextField label="戒龄 / Ordination Years" type="number" value={String(form.ordinationYears)} readOnly onChange={() => undefined} />
    </div>
  )
}

interface WellbeingStepProps extends StepProps {
  toggleWellbeing: (key: WellbeingDomain) => void
}

const WELLBEING_LABELS: Record<WellbeingDomain, string> = {
  physicalHealth: 'Physical Health / 身体健康',
  mentalHealth: 'Mental Health / 心理健康',
  socialSupport: 'Social Support / 社会支持',
  financialStability: 'Financial Stability / 经济稳定',
  livingConditions: 'Living Conditions / 居住条件',
  spiritual: 'Spiritual Wellbeing / 灵性健康',
  legalIssues: 'Legal Issues / 法律问题',
}

function WellbeingStep({ form, updateField, toggleWellbeing }: WellbeingStepProps) {
  return (
    <div>
      <div className="info-section-title">健康评估 / Wellbeing Issues</div>
      <div className="form-grid">
        {(Object.keys(form.wellbeingIssues) as WellbeingDomain[]).map((key) => (
          <div key={key} className="form-group">
            <CheckboxRow
              checked={form.wellbeingIssues[key]}
              label={WELLBEING_LABELS[key]}
              onChange={() => toggleWellbeing(key)}
            />
          </div>
        ))}
      </div>
      <TextareaField
        label="健康备注 / Wellbeing Remarks"
        value={form.wellbeingRemarks}
        onChange={(value) => updateField('wellbeingRemarks', value)}
        fullWidth
        className="form-section-field"
      />
    </div>
  )
}

interface NeedsAndNotesStepProps extends StepProps {
  toggleSpecialNeed: (key: SpecialNeedKey) => void
}

function NeedsAndNotesStep({ form, updateField, toggleSpecialNeed }: NeedsAndNotesStepProps) {
  return (
    <div>
      <div className="info-section-title">特殊需求 / Special Needs</div>
      <div className="form-grid">
        {(Object.keys(form.specialNeeds) as SpecialNeedKey[]).map((key) => (
          <div key={key} className="form-group">
            <CheckboxRow
              checked={form.specialNeeds[key]}
              label={capitalize(key)}
              onChange={() => toggleSpecialNeed(key)}
            />
          </div>
        ))}
      </div>
      <TextareaField
        label="特殊需求备注 / Special Needs Remarks"
        value={form.specialNeedsRemarks}
        onChange={(value) => updateField('specialNeedsRemarks', value)}
        fullWidth
        className="form-section-field"
      />

      <div className="info-section-title">财务信息 / Financial</div>
      <div className="form-grid">
        <TextField
          label="银行转账账户 / Bank Transfer Account"
          value={form.bankTransferInfo}
          onChange={(value) => updateField('bankTransferInfo', value)}
        />
        <TextField
          label="PayNow 号码 / PayNow Number"
          value={form.payNowInfo}
          onChange={(value) => updateField('payNowInfo', value)}
        />
      </div>

      <TextareaField
        label="备注 / Comments"
        value={form.comments}
        onChange={(value) => updateField('comments', value)}
        fullWidth
        className="form-section-field"
      />
    </div>
  )
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
