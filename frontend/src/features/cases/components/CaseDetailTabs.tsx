import { type ReactNode, useState } from 'react'
import type { AuditLogEntry, Case, CaseFlag, CaseNote, CaseServices, CaseTask } from '../types'
import { CASE_COLOR_LABELS, CASE_SERVICE_LABELS } from '../types'
import { CaseAuditTab } from './CaseAuditTab'
import { CaseIntensityDot } from './CaseIntensityDot'
import { CaseStatusBadge } from './CaseStatusBadge'

type TabId = 'overview' | 'services' | 'notes' | 'documents' | 'reports' | 'history' | 'audit'

interface TabDef {
  id: TabId
  zh: string
  en: string
  managerOnly?: boolean
  count?: number
}

interface CaseDetailTabsProps {
  caseData: Case
  notes: CaseNote[]
  auditLog: AuditLogEntry[]
  flags: CaseFlag[]
  isManager: boolean
}

function activeServiceCount(services: CaseServices): number {
  return Object.values(services).filter(Boolean).length
}

export function CaseDetailTabs({ caseData, notes, auditLog, flags, isManager }: CaseDetailTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  const serviceCount = activeServiceCount(caseData.services)

  const tabs: TabDef[] = [
    { id: 'overview',   zh: '概览',     en: 'Overview' },
    { id: 'services',   zh: '服务模块', en: 'Services', count: serviceCount },
    { id: 'notes',      zh: '案例笔记', en: 'Notes',    count: notes.length },
    { id: 'documents',  zh: '文件',     en: 'Documents' },
    { id: 'reports',    zh: '探访报告', en: 'Reports' },
    { id: 'history',    zh: '历史',     en: 'History' },
    { id: 'audit',      zh: '审计',     en: 'Audit', managerOnly: true },
  ]

  const visibleTabs = isManager ? tabs : tabs.filter((t) => !t.managerOnly)

  return (
    <>
      <div className="case-detail-tab-bar">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={'case-detail-tab-btn' + (activeTab === tab.id ? ' active' : '')}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.zh} / {tab.en}
            {tab.id === 'audit' ? ' ⚙' : null}
            {tab.count != null && tab.count > 0 ? (
              <span className="case-tab-badge">{tab.count}</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="case-detail-tab-content">
        {activeTab === 'overview'  ? <OverviewTab  caseData={caseData} /> : null}
        {activeTab === 'services'  ? <ServicesTab  services={caseData.services} /> : null}
        {activeTab === 'notes'     ? <NotesTab     notes={notes} /> : null}
        {activeTab === 'documents' ? <PlaceholderTab zh="文件" en="Documents" /> : null}
        {activeTab === 'reports'   ? <PlaceholderTab zh="探访报告" en="Visit Reports" /> : null}
        {activeTab === 'history'   ? <PlaceholderTab zh="状态历史" en="Status History" /> : null}
        {activeTab === 'audit' && isManager ? (
          <CaseAuditTab caseData={caseData} notes={notes} auditLog={auditLog} flags={flags} />
        ) : null}
      </div>
    </>
  )
}

function OverviewTab({ caseData }: { caseData: Case }) {
  const intensityLabel = CASE_COLOR_LABELS[caseData.colorCode]
  const serviceCount = activeServiceCount(caseData.services)

  return (
    <>
      <div className="case-detail-info-grid">
        <InfoCell label="开案日期 / DATE OPENED" value={caseData.dateOpened} />
        <InfoCell
          label="状态 / STATUS"
          value={<CaseStatusBadge status={caseData.status} />}
        />
        <InfoCell label="主责社工 / CASEWORKER" value={caseData.socialWorker || '—'} />
        <InfoCell label="负责义工 / ASSIGNED VOLUNTEER" value={caseData.assignedVolunteer || '—'} />
        <InfoCell
          label="个案强度 / INTENSITY"
          value={
            <span className="case-detail-intensity-label">
              <CaseIntensityDot colorCode={caseData.colorCode} />
              {intensityLabel.zh}
            </span>
          }
        />
        <InfoCell
          label="启用服务模块 / ACTIVE MODULES"
          value={`${serviceCount} 项 · ${serviceCount} module(s)`}
        />
        {caseData.comments ? (
          <InfoCell label="备注 / COMMENTS" value={caseData.comments} wide />
        ) : null}
        {caseData.remarks ? (
          <InfoCell label="补充说明 / REMARKS" value={caseData.remarks} wide />
        ) : null}
        {caseData.lastModifiedAt ? (
          <InfoCell
            label="最后修改 / LAST MODIFIED"
            value={`${caseData.lastModifiedAt}${caseData.lastModifiedBy ? ` by ${caseData.lastModifiedBy}` : ''}`}
            wide
          />
        ) : null}
      </div>

      {caseData.tasks && caseData.tasks.length > 0 ? (
        <TaskList tasks={caseData.tasks} />
      ) : null}
    </>
  )
}

function InfoCell({
  label,
  value,
  wide,
}: {
  label: string
  value: ReactNode
  wide?: boolean
}) {
  return (
    <div className={'case-detail-info-item' + (wide ? ' wide' : '')}>
      <span className="case-detail-info-label">{label}</span>
      <span className="case-detail-info-value">{value}</span>
    </div>
  )
}

function TaskList({ tasks }: { tasks: CaseTask[] }) {
  return (
    <div>
      <div className="case-task-section-title">任务清单 / Task List</div>
      <div className="case-task-list">
        {tasks.map((task) => (
          <div key={task.id} className="case-task-item">
            <div className={'case-task-checkbox' + (task.completed ? ' done' : '')}>
              {task.completed ? (
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : null}
            </div>
            <div className="case-task-body">
              <div className={'case-task-title-zh' + (task.completed ? ' done' : '')}>
                {task.titleZh}
              </div>
              <div className={'case-task-title-en' + (task.completed ? ' done' : '')}>
                {task.titleEn}
              </div>
              <div className="case-task-meta">
                截止 / Due: {task.dueDate}
                {task.completed && task.completedAt ? (
                  <span className="case-task-done-badge">
                    {' '}✓ 完成 / Done: {formatCompletedAt(task.completedAt)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function formatCompletedAt(iso: string): string {
  const d = new Date(iso)
  const date = d.toISOString().slice(0, 10)
  const hhmm = d.toLocaleTimeString('en-SG', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Singapore' })
  return `${date} ${hhmm}`
}

const SERVICE_GROUPS: { key: string; zh: string; en: string }[] = [
  { key: 'practical', zh: '实务支持', en: 'Practical Support' },
  { key: 'emotional', zh: '情感 / 社交', en: 'Emotional / Social' },
  { key: 'admin',     zh: '行政协助', en: 'Administrative' },
  { key: 'spiritual', zh: '灵性 / 社区', en: 'Spiritual / Community' },
]

function ServicesTab({ services }: { services: CaseServices }) {
  return (
    <>
      {SERVICE_GROUPS.map((group) => {
        const items = (Object.keys(CASE_SERVICE_LABELS) as (keyof CaseServices)[]).filter(
          (k) => CASE_SERVICE_LABELS[k].group === group.key,
        )
        return (
          <div key={group.key}>
            <div className="case-services-section-title">
              {group.zh} / {group.en}
            </div>
            <div className="case-services-grid">
              {items.map((key) => (
                <div key={key} className="case-services-item">
                  <span className={'dot ' + (services[key] ? 'dot-yes' : 'dot-no')} />
                  {CASE_SERVICE_LABELS[key].zh} / {CASE_SERVICE_LABELS[key].en}
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </>
  )
}

function NotesTab({ notes }: { notes: CaseNote[] }) {
  if (notes.length === 0) {
    return <p className="case-placeholder-text">暂无案例笔记 / No notes yet.</p>
  }

  return (
    <div className="case-note-list">
      {notes.map((note) => (
        <div key={note.id} className="case-note-item">
          <div className="case-note-header">
            <span className="case-note-date">{note.date}</span>
            <span className="case-note-author">记录人 / By: {note.recordedBy}</span>
          </div>
          <p className="case-note-content">{note.content}</p>
          {note.followUp ? (
            <div className="case-note-followup">跟进 / Follow-up: {note.followUp}</div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function PlaceholderTab({ zh, en }: { zh: string; en: string }) {
  return (
    <p className="case-placeholder-text">
      {zh}功能即将推出 / {en} coming soon.
    </p>
  )
}
