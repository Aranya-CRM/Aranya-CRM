import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { fetchClientById } from '../../services/client.api'
import type { Client, WellbeingDomain } from '../../types/client'
import './clients.css'

const WELLBEING_LABELS: Record<WellbeingDomain, string> = {
  physicalHealth: 'Physical Health / 身体健康',
  mentalHealth: 'Mental Health / 心理健康',
  socialSupport: 'Social Support / 社会支持',
  financialStability: 'Financial Stability / 经济稳定',
  livingConditions: 'Living Conditions / 居住条件',
  spiritualWellbeing: 'Spiritual Wellbeing / 灵性健康',
  legalIssues: 'Legal Issues / 法律问题',
  substanceUse: 'Substance Use / 物质使用',
}

const SPECIAL_NEEDS_LABELS: Record<string, string> = {
  physical: 'Physical / 肢体',
  hearing: 'Hearing / 听力',
  visual: 'Visual / 视力',
  intellectual: 'Intellectual / 智力',
}

type TabId = 'basic' | 'identity' | 'personal' | 'ordination' | 'wellbeing' | 'cases'

interface TabDef {
  id: TabId
  zh: string
  en: string
  swOnly?: boolean
}

const TABS: TabDef[] = [
  { id: 'basic', zh: '基本信息', en: 'Basic Info' },
  { id: 'identity', zh: '身份文件', en: 'Identity', swOnly: true },
  { id: 'personal', zh: '个人信息', en: 'Personal', swOnly: true },
  { id: 'ordination', zh: '受戒历史', en: 'Ordination', swOnly: true },
  { id: 'wellbeing', zh: '健康评估', en: 'Wellbeing', swOnly: true },
  { id: 'cases', zh: '关联个案', en: 'Cases', swOnly: true },
]

function InfoItem({ label, value }: { label: string; value: string | number | boolean | undefined }) {
  const display = value === undefined || value === '' ? '—' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)
  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className="info-value">{display}</span>
    </div>
  )
}

function BasicTab({ client }: { client: Client }) {
  return (
    <div className="tab-content">
      <div className="info-grid">
        <InfoItem label="法名 (中) / Chinese Name" value={client.nameChn} />
        <InfoItem label="法名 (英) / English Name" value={client.nameEn} />
        <InfoItem label="缩写 / Abbreviation" value={client.abbr} />
        <InfoItem label="联系电话 / Contact" value={client.contact} />
        <InfoItem label="首选联系方式 / Preferred Communication" value={client.preferredCommunication} />
        <InfoItem label="首选语言 / Preferred Language" value={client.preferredLanguage} />
        <InfoItem label="区域 / Area" value={client.area} />
        <InfoItem label="佛教传承 / Buddhist Tradition" value={client.buddhistTradition} />
        <InfoItem label="戒别 / Ordination Status" value={client.ordinationStatus} />
        <InfoItem label="会员状态 / Membership Status" value={client.membershipStatus} />
      </div>
    </div>
  )
}

function IdentityTab({ client }: { client: Client }) {
  return (
    <div className="tab-content">
      <div className="info-grid">
        <InfoItem label="NRIC 姓名 (英) / NRIC Name (EN)" value={client.nricNameEn} />
        <InfoItem label="NRIC 姓名 (中) / NRIC Name (CN)" value={client.nricNameChn} />
        <InfoItem label="NRIC 号码 / NRIC No." value={client.nricNo} />
        <InfoItem label="受戒证书 / Ordination Certificate" value={client.ordinationCertificate} />
        <InfoItem label="验证日期 / Date of Verification" value={client.dateVerification} />
      </div>
    </div>
  )
}

function PersonalTab({ client }: { client: Client }) {
  return (
    <div className="tab-content">
      <div className="info-grid">
        <InfoItem label="性别 / Sex" value={client.sex} />
        <InfoItem label="出生日期 / Date of Birth" value={client.dateOfBirth} />
        <InfoItem label="年龄 / Age" value={client.age} />
        <InfoItem label="婚姻状况 / Marital Status" value={client.maritalStatus} />
        <InfoItem label="国籍 / Nationality" value={client.nationality} />
        <InfoItem label="族裔 / Ethnicity" value={client.ethnicity} />
        <InfoItem label="方言 / Dialect Group" value={client.dialectGroup} />
        <InfoItem label="口语 / Spoken Languages" value={client.spokenLanguage} />
        <InfoItem label="地址 / Address" value={client.address} />
        <InfoItem label="邮编 / Postal Code" value={client.postalCode} />
        <InfoItem label="精舍类型 / Vihara Type" value={client.viharaType} />
        <InfoItem label="近亲 / Next of Kin" value={client.nextOfKin} />
        <InfoItem label="WhatsApp 使用 / Able to use WhatsApp" value={client.ableToUseWhatsApp} />
        <InfoItem label="加入日期 / Date Joined" value={client.dateJoined} />
        <InfoItem label="会员备注 / Membership Remarks" value={client.membershipRemarks} />
      </div>
    </div>
  )
}

function OrdinationTab({ client }: { client: Client }) {
  return (
    <div className="tab-content">
      <div className="info-section-title">剃度信息 / Tonsure</div>
      <div className="info-grid">
        <InfoItem label="剃度日期 / Date of Tonsure" value={client.dateTonsure} />
        <InfoItem label="剃度国家 / Country" value={client.countryTonsure} />
        <InfoItem label="剃度地点 / Place" value={client.placeTonsure} />
      </div>
      <div className="info-section-title">受戒信息 / Ordination</div>
      <div className="info-grid">
        <InfoItem label="受戒日期 / Date of Ordination" value={client.dateOrdination} />
        <InfoItem label="受戒国家 / Country" value={client.countryOrdination} />
        <InfoItem label="受戒地点 / Place" value={client.placeOrdination} />
        <InfoItem label="戒龄 / Ordination Years" value={client.ordinationYears} />
        <InfoItem label="佛教传承 / Buddhist Tradition" value={client.buddhistTradition} />
        <InfoItem label="戒别 / Ordination Status" value={client.ordinationStatus} />
      </div>
    </div>
  )
}

function WellbeingTab({ client }: { client: Client }) {
  return (
    <div className="tab-content">
      <div className="info-section-title">健康评估 / Wellbeing Assessment</div>
      <div className="check-grid">
        {(Object.keys(WELLBEING_LABELS) as WellbeingDomain[]).map((key) => (
          <div key={key} className="check-item">
            <span className={'dot ' + (client.wellbeingIssues[key] ? 'dot-yes' : 'dot-no')} />
            {WELLBEING_LABELS[key]}
          </div>
        ))}
      </div>
      {client.wellbeingRemarks && (
        <>
          <div className="info-section-title">备注 / Remarks</div>
          <p style={{ fontSize: 13, color: 'var(--text-normal)', lineHeight: 1.6 }}>{client.wellbeingRemarks}</p>
        </>
      )}

      <div className="info-section-title">特殊需求 / Special Needs</div>
      <div className="check-grid">
        {Object.entries(SPECIAL_NEEDS_LABELS).map(([key, label]) => (
          <div key={key} className="check-item">
            <span className={'dot ' + (client.specialNeeds[key as keyof typeof client.specialNeeds] ? 'dot-yes' : 'dot-no')} />
            {label}
          </div>
        ))}
      </div>
      {client.specialNeedsRemarks && (
        <>
          <div className="info-section-title">特殊需求备注 / Special Needs Remarks</div>
          <p style={{ fontSize: 13, color: 'var(--text-normal)', lineHeight: 1.6 }}>{client.specialNeedsRemarks}</p>
        </>
      )}

      <div className="info-section-title">财务信息 / Financial</div>
      <div className="info-grid">
        <InfoItem label="银行转账 / Bank Transfer" value={client.bankTransfer} />
        <InfoItem label="PayNow" value={client.payNow} />
      </div>

      {client.comments && (
        <>
          <div className="info-section-title">备注 / Comments</div>
          <p style={{ fontSize: 13, color: 'var(--text-normal)', lineHeight: 1.6 }}>{client.comments}</p>
        </>
      )}
    </div>
  )
}

function CasesTab({ clientId }: { clientId: string }) {
  // Placeholder - will be populated when CaseListPage is implemented
  return (
    <div className="tab-content">
      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>
        关联个案将在个案模块实现后展示。 / Related cases will be shown after cases module is implemented.
      </p>
      <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 4 }}>
        Client ID: {clientId}
      </p>
    </div>
  )
}

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { isSocialWorker } = useAuth()
  const navigate = useNavigate()
  const [client, setClient] = useState<Client>()
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabId>('basic')

  useEffect(() => {
    let active = true
    async function load() {
      if (!id) return
      try {
        const data = await fetchClientById(id)
        if (active) setClient(data)
      } catch {
        // handled silently
      } finally {
        if (active) setLoading(false)
      }
    }
    void load()
    return () => { active = false }
  }, [id])

  const visibleTabs = isSocialWorker ? TABS : TABS.filter((t) => !t.swOnly)

  if (loading) {
    return (
      <>
        <h2 className="page-title">加载中...</h2>
        <div className="page-subtitle">Loading...</div>
      </>
    )
  }

  if (!client) {
    return (
      <>
        <h2 className="page-title">未找到</h2>
        <div className="page-subtitle">Client Not Found</div>
        <button className="btn-secondary" type="button" style={{ marginTop: 16 }} onClick={() => navigate('/clients')}>
          返回列表 / Back to List
        </button>
      </>
    )
  }

  return (
    <>
      <button className="back-link" type="button" onClick={() => navigate('/clients')}>
        ← 返回列表 / Back to List
      </button>

      <div className="detail-title-row">
        <div className="detail-name">
          <h2>{client.nameChn} / {client.nameEn}</h2>
          <span className="abbr-tag">{client.abbr}</span>
          <span className={'membership-badge membership-' + client.membershipStatus.toLowerCase()}>
            {client.membershipStatus}
          </span>
        </div>
        {isSocialWorker && (
          <button className="btn-primary" type="button" onClick={() => navigate(`/clients/${client.id}/edit`)}>
            编辑 / Edit
          </button>
        )}
      </div>

      <div className="tab-bar">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            className={'tab-btn' + (activeTab === tab.id ? ' active' : '')}
            type="button"
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.zh} / {tab.en}
          </button>
        ))}
      </div>

      {activeTab === 'basic' && <BasicTab client={client} />}
      {activeTab === 'identity' && isSocialWorker && <IdentityTab client={client} />}
      {activeTab === 'personal' && isSocialWorker && <PersonalTab client={client} />}
      {activeTab === 'ordination' && isSocialWorker && <OrdinationTab client={client} />}
      {activeTab === 'wellbeing' && isSocialWorker && <WellbeingTab client={client} />}
      {activeTab === 'cases' && isSocialWorker && <CasesTab clientId={client.id} />}

      {!isSocialWorker && (
        <div className="volunteer-notice">
          如需查看完整档案，请联系 Social Worker。 / For full profile access, please contact a Social Worker.
        </div>
      )}
    </>
  )
}
