import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { deleteReport, fetchReportById } from '../api/report.api'
import type { ReportDetail } from '../types'
import './reports.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

function displayText(value: string | null | undefined, fallback = '-'): string {
  return value?.trim() || fallback
}

function displayClientName(report: ReportDetail): string {
  const zh = report.clientNameChn?.trim()
  const en = report.clientNameEn?.trim()

  if (zh && en) return `${zh} / ${en}`
  return zh || en || '未命名僧人 / Unnamed monastic'
}

interface DetailItemProps {
  labelZh: string
  labelEn: string
  value: string
}

function DetailItem({ labelZh, labelEn, value }: DetailItemProps) {
  return (
    <div className="report-detail-item">
      <div className="report-detail-label">
        <span>{labelZh}</span>
        <span>{labelEn}</span>
      </div>
      <div className="report-detail-value">{value}</div>
    </div>
  )
}

interface TextBlockProps {
  titleZh: string
  titleEn: string
  value: string | null | undefined
}

function TextBlock({ titleZh, titleEn, value }: TextBlockProps) {
  return (
    <section className="report-text-block">
      <h3>{titleZh}</h3>
      <div className="report-text-subtitle">{titleEn}</div>
      <p>{displayText(value, '暂无内容 / No content')}</p>
    </section>
  )
}

export function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [report, setReport] = useState<ReportDetail>()
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true

    async function loadReport() {
      if (!id) {
        setErrorMessage('缺少报告编号。 / Missing report ID.')
        setIsLoading(false)
        return
      }

      setIsLoading(true)

      try {
        const data = await fetchReportById(id)
        if (active) {
          setReport(data)
          setErrorMessage(undefined)
        }
      } catch {
        if (active) {
          setErrorMessage('探访报告加载失败，请稍后重试。 / Failed to load report.')
        }
      } finally {
        if (active) {
          setIsLoading(false)
        }
      }
    }

    void loadReport()

    return () => {
      active = false
    }
  }, [id])

  const reportTitle = useMemo(() => {
    if (!report) return '探访报告详情'
    return `RPT-${String(report.id).padStart(4, '0')}`
  }, [report])

  async function handleDelete() {
    if (!report) return

    const confirmed = window.confirm(`确认删除报告 RPT-${String(report.id).padStart(4, '0')}？ / Delete this report?`)
    if (!confirmed) return

    setIsDeleting(true)
    setErrorMessage(undefined)

    try {
      await deleteReport(report.id)
      navigate('/reports')
    } catch {
      setErrorMessage('探访报告删除失败，请稍后重试。 / Failed to delete report.')
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="report-page">
        <PageHeader titleZh="加载中..." titleEn="Loading report..." />
      </div>
    )
  }

  if (errorMessage || !report) {
    return (
      <div className="report-page">
        <BackButton onClick={() => navigate('/reports')}>← 返回列表 / Back to List</BackButton>
        <PageHeader titleZh="未找到探访报告" titleEn="Report Not Found" />
        {errorMessage ? <ErrorBanner message={errorMessage} /> : null}
      </div>
    )
  }

  return (
    <div className="report-page">
      <BackButton onClick={() => navigate('/reports')}>← 返回列表 / Back to List</BackButton>

      <PageHeader
        titleZh={reportTitle}
        titleEn={`Report Detail · ${displayClientName(report)}`}
        descriptionZh={`提交人：${displayText(report.createdByName ?? report.staffName, 'Unknown')}`}
        descriptionEn={`Created at ${formatDate(report.createdAt ?? report.reportTimestamp)}`}
      />

      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <SectionCard className="report-action-card" ariaLabel="Report actions" bodyPadding>
        <div className="report-action-header">
          <div>
            <h2>探访报告</h2>
            <p>
              Observation Report · Submitted by: {displayText(report.createdByName ?? report.staffName, 'Unknown')} · {formatDate(report.dateOfVisit)}
            </p>
          </div>
          <div className="report-status-stack">
            <span className="report-status-submitted">Submitted</span>
            <span className="report-status-urgent">⚠ 紧急 · Urgent</span>
          </div>
        </div>

        <div className="report-detail-actions">
          <button className="report-action-danger" type="button" onClick={() => window.alert('Mock only: resolve flag is not implemented yet.')}>
            处理标记 · Resolve Flag
          </button>
          <button className="report-action-success" type="button" onClick={() => window.alert('Mock only: approve is not implemented yet.')}>
            审批 · Approve
          </button>
          <button className="report-action-secondary" type="button" onClick={() => window.alert('Mock only: archive is not implemented yet.')}>
            归档 · Archive
          </button>
          <button className="report-action-delete" type="button" disabled={isDeleting} onClick={() => void handleDelete()}>
            {isDeleting ? '删除中...' : '删除 · Delete'}
          </button>
        </div>

        <div className="report-urgent-mock-banner">
          <span>
            🚨 此报告由 {displayText(report.createdByName ?? report.staffName, 'Unknown')} 标记为紧急。
            <br />
            This report was marked URGENT by {displayText(report.createdByName ?? report.staffName, 'Unknown')}.
          </span>
          <button type="button" onClick={() => window.alert('Mock only: mark resolved is not implemented yet.')}>
            ✓ 标记为已处理 · Mark Resolved
          </button>
        </div>
      </SectionCard>

      <SectionCard className="report-detail-card" ariaLabel="Report summary" bodyPadding>
        <div className="report-detail-grid">
          <DetailItem labelZh="僧人" labelEn="Client" value={displayClientName(report)} />
          <DetailItem labelZh="提交人" labelEn="Created By" value={displayText(report.createdByName ?? report.staffName, 'Unknown')} />
          <DetailItem labelZh="探访日期" labelEn="Visit Date" value={formatDate(report.dateOfVisit)} />
          <DetailItem labelZh="探访时间" labelEn="Visit Time" value={displayText(report.timeOfVisit)} />
          <DetailItem labelZh="时长" labelEn="Duration" value={displayText(report.durationOfVisit)} />
          <DetailItem labelZh="地点" labelEn="Location" value={displayText(report.location)} />
          <DetailItem labelZh="项目" labelEn="Programme" value={displayText(report.programmeName)} />
          <DetailItem labelZh="探访类型" labelEn="Visit Type" value={displayText(report.typeOfVisit)} />
        </div>
      </SectionCard>

      <div className="report-detail-sections">
        <TextBlock titleZh="探访目的" titleEn="Purpose of Visit" value={report.purposeOfVisit} />
        <TextBlock titleZh="完成事项" titleEn="What Was Done" value={report.whatWasDone} />
        <TextBlock titleZh="环境观察" titleEn="Environment Observations" value={report.environmentObservations} />
        <TextBlock titleZh="僧团观察" titleEn="Sangha Observations" value={report.sanghaObservations} />
        <TextBlock titleZh="其他观察" titleEn="Other Observations" value={report.otherObservations} />
        <TextBlock titleZh="个人反思" titleEn="Personal Reflections" value={report.personalReflections} />
        <TextBlock titleZh="建议" titleEn="Recommendations" value={report.recommendations} />
        <TextBlock titleZh="需关注事项" titleEn="Matters to Highlight" value={report.mattersToHighlight} />
      </div>
    </div>
  )
}
