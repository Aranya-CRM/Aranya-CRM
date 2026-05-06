import type { Client, WellbeingDomain } from '../../../types/client'
import { CheckboxRow, SelectField, TextareaField, TextField } from '../../../shared/ui/form'

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
          checked={form.ableToUseWhatsApp}
          label="可以使用 WhatsApp / Able to use WhatsApp"
          onChange={(checked) => updateField('ableToUseWhatsApp', checked)}
        />
      </div>
      <TextField label="首选语言 / Preferred Language" value={form.preferredLanguage} onChange={(value) => updateField('preferredLanguage', value)} />
      <TextField label="口语 / Spoken Languages" value={form.spokenLanguage} onChange={(value) => updateField('spokenLanguage', value)} />
      <TextField label="地址 / Address" value={form.address} onChange={(value) => updateField('address', value)} fullWidth />
      <TextField label="邮编 / Postal Code" value={form.postalCode} onChange={(value) => updateField('postalCode', value)} />
      <TextField label="区域 / Area" value={form.area} onChange={(value) => updateField('area', value)} />
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
      <TextField label="验证日期 / Date of Verification" type="date" value={form.dateVerification} onChange={(value) => updateField('dateVerification', value)} />
    </div>
  )
}

function PersonalStep({ form, updateField }: StepProps) {
  return (
    <div className="form-grid">
      <SelectField
        label="性别 / Sex"
        value={form.sex}
        options={['Male', 'Female']}
        onChange={(value) => updateField('sex', value as Client['sex'])}
      />
      <TextField label="出生日期 / Date of Birth" type="date" value={form.dateOfBirth} onChange={(value) => updateField('dateOfBirth', value)} />
      <TextField label="年龄 / Age" type="number" value={String(form.age)} onChange={(value) => updateField('age', Number(value))} />
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
      <TextField label="近亲 / Next of Kin" value={form.nextOfKin} onChange={(value) => updateField('nextOfKin', value)} fullWidth />
      <SelectField
        label="会员状态 / Membership Status"
        value={form.membershipStatus}
        options={['Active', 'Inactive', 'Discharged', 'Withdrawn', 'Deceased']}
        onChange={(value) => updateField('membershipStatus', value as Client['membershipStatus'])}
      />
      <TextField label="加入日期 / Date Joined" type="date" value={form.dateJoined} onChange={(value) => updateField('dateJoined', value)} />
      <TextareaField label="会员备注 / Membership Remarks" value={form.membershipRemarks} onChange={(value) => updateField('membershipRemarks', value)} fullWidth />
    </div>
  )
}

function OrdinationStep({ form, updateField }: StepProps) {
  return (
    <div className="form-grid">
      <SelectField
        label="佛教传承 / Buddhist Tradition"
        value={form.buddhistTradition}
        options={['Theravada', 'Mahayana', 'Vajrayana']}
        onChange={(value) => updateField('buddhistTradition', value as Client['buddhistTradition'])}
      />
      <SelectField
        label="戒别 / Ordination Status"
        value={form.ordinationStatus}
        options={['Bhikkhu', 'Bhikkhuni', 'Samanera', 'Sikkhamana', 'Sayalay']}
        onChange={(value) => updateField('ordinationStatus', value as Client['ordinationStatus'])}
      />
      <TextField label="剃度日期 / Date of Tonsure" type="date" value={form.dateTonsure} onChange={(value) => updateField('dateTonsure', value)} />
      <TextField label="剃度国家 / Country of Tonsure" value={form.countryTonsure} onChange={(value) => updateField('countryTonsure', value)} />
      <TextField label="剃度地点 / Place of Tonsure" value={form.placeTonsure} onChange={(value) => updateField('placeTonsure', value)} fullWidth />
      <TextField label="受戒日期 / Date of Ordination" type="date" value={form.dateOrdination} onChange={(value) => updateField('dateOrdination', value)} />
      <TextField label="受戒国家 / Country of Ordination" value={form.countryOrdination} onChange={(value) => updateField('countryOrdination', value)} />
      <TextField label="受戒地点 / Place of Ordination" value={form.placeOrdination} onChange={(value) => updateField('placeOrdination', value)} fullWidth />
      <TextField label="戒龄 / Ordination Years" type="number" value={String(form.ordinationYears)} onChange={(value) => updateField('ordinationYears', Number(value))} />
    </div>
  )
}

interface WellbeingStepProps extends StepProps {
  toggleWellbeing: (key: WellbeingDomain) => void
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
              label={formatCamelCase(key)}
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
        <div className="form-group">
          <CheckboxRow checked={form.bankTransfer} label="银行转账 / Bank Transfer" onChange={(checked) => updateField('bankTransfer', checked)} />
        </div>
        <div className="form-group">
          <CheckboxRow checked={form.payNow} label="PayNow" onChange={(checked) => updateField('payNow', checked)} />
        </div>
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

function formatCamelCase(value: string): string {
  return value.replace(/([A-Z])/g, ' $1').trim()
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}
