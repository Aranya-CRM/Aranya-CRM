import { useEffect, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { BackButton, ErrorBanner, PageHeader, SectionCard } from '../../../shared/ui'
import { fetchReports } from '../../reports/api/report.api'
import type { ReportSummary } from '../../reports/types'
import { CASE_COLOR_KEYS } from '../../cases/types'
import { useCase, useCreateCaseNote, useDeleteCaseNote, useOwnCaseNotes } from '../../cases/hooks'
import './tasks.css'

function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  return value.slice(0, 10)
}

function reportClientMatches(report: ReportSummary, clientId: string | undefined): boolean {
  return Boolean(clientId && report.clientId != null && String(report.clientId) === clientId)
}

function reportStatusKey(report: ReportSummary): 'DRAFT' | 'SUBMITTED' | 'ARCHIVED' | 'RETURNED' {
  if (report.status === 'DRAFT') return 'DRAFT'
  if (report.status === 'ARCHIVED') return 'ARCHIVED'
  if (report.status === 'RETURNED') return 'RETURNED'
  return 'SUBMITTED'
}

export function TaskDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isZh = i18n.language === 'zh'
  const { data: caseData, isLoading } = useCase(id)
  const { data: notes = [], refetch: refetchNotes } = useOwnCaseNotes(id)
  const createNote = useCreateCaseNote()
  const deleteNote = useDeleteCaseNote(id)
  const [reports, setReports] = useState<ReportSummary[]>([])
  const [content, setContent] = useState('')
  const [followUp, setFollowUp] = useState('')
  const [errorMessage, setErrorMessage] = useState<string>()

  useEffect(() => {
    let active = true
    fetchReports({ mine: true })
      .then((data) => {
        if (active) setReports(data)
      })
      .catch(() => {
        if (active) setErrorMessage(t('tasks.reportsLoadError'))
      })
    return () => {
      active = false
    }
  }, [t])

  const myReports = reports.filter((report) => reportClientMatches(report, caseData?.clientId))

  async function handleAddNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!id || !content.trim()) return
    setErrorMessage(undefined)
    try {
      await createNote.mutateAsync({ caseId: id, content, followUp })
      setContent('')
      setFollowUp('')
      await refetchNotes()
    } catch {
      setErrorMessage(t('tasks.noteError'))
    }
  }

  async function handleDeleteNote(noteId: string) {
    if (!window.confirm(t('tasks.confirmDeleteNote'))) return
    setErrorMessage(undefined)
    try {
      await deleteNote.mutateAsync(noteId)
      await refetchNotes()
    } catch {
      setErrorMessage(t('tasks.deleteNoteError'))
    }
  }

  if (isLoading) {
    return <div className="task-page"><PageHeader title={t('common.loading')} /></div>
  }

  if (!caseData) {
    return (
      <div className="task-page">
        <BackButton onClick={() => navigate('/tasks')} />
        <PageHeader title={t('tasks.notFound')} />
      </div>
    )
  }

  const clientName = isZh ? caseData.clientNameChn || caseData.clientNameEn : caseData.clientNameEn || caseData.clientNameChn

  return (
    <div className="task-page">
      <BackButton onClick={() => navigate('/tasks')} />
      <PageHeader title={caseData.caseNo} subtitle={`${clientName} · ${caseData.tradition}`} />
      {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

      <SectionCard className="task-detail-card" title={t('tasks.caseOverview')} ariaLabel="Case overview" bodyPadding>
        <div className="task-overview-grid">
          <Info label={t('cases.overview.dateOpened')} value={caseData.dateOpened} />
          <Info label={t('cases.overview.status')} value={caseData.status} />
          <Info label={t('cases.overview.caseworker')} value={caseData.socialWorker || '-'} />
          <Info label={t('cases.overview.intensity')} value={t(CASE_COLOR_KEYS[caseData.colorCode])} />
          <Info label={t('cases.overview.comments')} value={caseData.comments || '-'} wide />
          <Info label={t('cases.overview.remarks')} value={caseData.remarks || '-'} wide />
        </div>
      </SectionCard>

      <div className="task-detail-grid">
        <SectionCard title={t('tasks.myReports')} ariaLabel="My reports" bodyPadding>
          {myReports.length === 0 ? (
            <div className="task-empty compact">{t('tasks.noReports')}</div>
          ) : (
            <div className="task-sub-list">
              {myReports.map((report) => (
                <button key={report.id} type="button" className="task-sub-row" onClick={() => navigate(`/reports?selected=${report.id}`)}>
                  <span>RPT-{String(report.id).padStart(4, '0')}</span>
                  <span>{formatDate(report.dateOfVisit)} · {report.typeOfVisit ?? t('reports.detail.title')} · {t(`reports.status.${reportStatusKey(report)}`)}</span>
                </button>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title={t('tasks.myNotes')} ariaLabel="My notes" bodyPadding>
          <form className="task-note-form" onSubmit={handleAddNote}>
            <textarea value={content} onChange={(event) => setContent(event.target.value)} placeholder={t('tasks.notePlaceholder')} />
            <input value={followUp} onChange={(event) => setFollowUp(event.target.value)} placeholder={t('tasks.followUpPlaceholder')} />
            <button className="btn-primary" type="submit" disabled={!content.trim() || createNote.isPending}>
              {createNote.isPending ? t('common.saving') : t('tasks.addNote')}
            </button>
          </form>
          <div className="task-sub-list note-list">
            {notes.length === 0 ? <div className="task-empty compact">{t('tasks.noNotes')}</div> : null}
            {notes.map((note) => (
              <article key={note.id} className="task-note">
                <div className="task-note-header">
                  <strong>{formatDate(note.createdAt)}</strong>
                  <button
                    type="button"
                    className="task-note-delete"
                    disabled={deleteNote.isPending}
                    onClick={() => void handleDeleteNote(note.id)}
                  >
                    {t('tasks.deleteNote')}
                  </button>
                </div>
                <p>{note.content}</p>
                {note.followUp ? <span>{t('cases.notes.followup')}: {note.followUp}</span> : null}
              </article>
            ))}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function Info({ label, value, wide }: { label: string, value: string, wide?: boolean }) {
  return (
    <div className={`task-info${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
