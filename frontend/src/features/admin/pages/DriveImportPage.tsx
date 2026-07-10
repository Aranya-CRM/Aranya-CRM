import { useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getApiErrorMessage } from '../../../shared/api'
import { useCases } from '../../cases/hooks'
import type { CaseDocumentCategory } from '../../cases/types'
import {
  importDriveFiles,
  listDriveFiles,
  type DriveEntry,
  type DriveImportResult,
} from '../api/driveMigration.api'
import './driveImport.css'

const CATEGORY_KEYS: { value: CaseDocumentCategory; labelKey: string }[] = [
  { value: 'ORDINATION', labelKey: 'cases.documents.category.ordination' },
  { value: 'MEDICAL', labelKey: 'cases.documents.category.medical' },
  { value: 'FINANCIAL', labelKey: 'cases.documents.category.financial' },
  { value: 'LEGAL', labelKey: 'cases.documents.category.legal' },
]

interface StagedItem {
  driveFileId: string
  fileName: string
  caseId: number
  caseLabel: string
  category: CaseDocumentCategory
}

function formatSize(bytes?: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(entry: DriveEntry): string {
  if (entry.folder) return '📁'
  if (entry.mimeType.startsWith('image/')) return '🖼'
  if (entry.mimeType === 'application/pdf') return '📕'
  if (entry.mimeType.includes('spreadsheet') || entry.mimeType.includes('sheet')) return '📗'
  if (entry.mimeType.includes('document') || entry.mimeType.includes('word')) return '📘'
  return '📄'
}

export function DriveImportPage() {
  const { t } = useTranslation()
  const [path, setPath] = useState<{ id: string; name: string }[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [staged, setStaged] = useState<StagedItem[]>([])
  const [caseSearch, setCaseSearch] = useState('')
  const [targetCaseId, setTargetCaseId] = useState('')
  const [targetCategory, setTargetCategory] = useState<CaseDocumentCategory>('ORDINATION')
  const [results, setResults] = useState<DriveImportResult[] | null>(null)
  const [error, setError] = useState('')

  const currentFolderId = path.length > 0 ? path[path.length - 1].id : undefined

  const { data: cases = [] } = useCases()
  const { data: entries = [], isLoading, isError, error: listError } = useQuery({
    queryKey: ['driveFiles', currentFolderId ?? 'root'],
    queryFn: () => listDriveFiles(currentFolderId),
  })

  const filteredCases = useMemo(() => {
    const q = caseSearch.trim().toLowerCase()
    return cases
      .filter((c) => !q || `${c.caseNo} ${c.clientNameEn} ${c.clientNameChn}`.toLowerCase().includes(q))
      .slice(0, 50)
  }, [cases, caseSearch])

  const caseLabel = (id: string) => {
    const c = cases.find((item) => item.id === id)
    return c ? `${c.caseNo} · ${c.clientNameEn}` : id
  }

  const importMutation = useMutation({
    mutationFn: () =>
      importDriveFiles(
        staged.map((s) => ({ driveFileId: s.driveFileId, caseId: s.caseId, category: s.category })),
      ),
    onSuccess: (res) => {
      setResults(res)
      const importedOrSkipped = new Set(
        res.filter((r) => r.status === 'IMPORTED' || r.status === 'SKIPPED').map((r) => r.driveFileId),
      )
      setStaged((prev) => prev.filter((s) => !importedOrSkipped.has(s.driveFileId)))
    },
    onError: (e) => setError(getApiErrorMessage(e) ?? t('driveImport.importError')),
  })

  function openFolder(entry: DriveEntry) {
    setPath((prev) => [...prev, { id: entry.id, name: entry.name }])
    setSelected(new Set())
  }

  function goTo(index: number) {
    setPath((prev) => prev.slice(0, index))
    setSelected(new Set())
  }

  function toggleSelect(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
  }

  const fileEntries = entries.filter((e) => !e.folder)
  const allSelected = fileEntries.length > 0 && fileEntries.every((e) => selected.has(e.id))

  function toggleSelectAll(checked: boolean) {
    setSelected(checked ? new Set(fileEntries.map((e) => e.id)) : new Set())
  }

  function assignSelected() {
    setError('')
    if (!targetCaseId) {
      setError(t('driveImport.pickCaseFirst'))
      return
    }
    const label = caseLabel(targetCaseId)
    const toAdd: StagedItem[] = fileEntries
      .filter((e) => selected.has(e.id) && !staged.some((s) => s.driveFileId === e.id && s.caseId === Number(targetCaseId)))
      .map((e) => ({
        driveFileId: e.id,
        fileName: e.name,
        caseId: Number(targetCaseId),
        caseLabel: label,
        category: targetCategory,
      }))
    setStaged((prev) => [...prev, ...toAdd])
    setSelected(new Set())
  }

  function removeStaged(driveFileId: string, caseId: number) {
    setStaged((prev) => prev.filter((s) => !(s.driveFileId === driveFileId && s.caseId === caseId)))
  }

  return (
    <div className="drive-import-page">
      <header className="drive-import-header">
        <h1>{t('driveImport.title')}</h1>
        <p>{t('driveImport.subtitle')}</p>
      </header>

      {error ? <div className="drive-import-error">{error}</div> : null}
      {isError ? <div className="drive-import-error">{getApiErrorMessage(listError) ?? t('driveImport.loadError')}</div> : null}

      <div className="drive-import-body">
        <section className="drive-import-browser">
          <div className="drive-breadcrumb">
            <button type="button" className="drive-crumb" onClick={() => goTo(0)}>{t('driveImport.root')}</button>
            {path.map((p, i) => (
              <span key={p.id}>
                <span className="drive-crumb-sep">/</span>
                <button type="button" className="drive-crumb" onClick={() => goTo(i + 1)}>{p.name}</button>
              </span>
            ))}
          </div>

          <div className="drive-assign-bar">
            <input
              className="drive-case-search"
              placeholder={t('driveImport.searchCase')}
              value={caseSearch}
              onChange={(e) => setCaseSearch(e.target.value)}
            />
            <select value={targetCaseId} onChange={(e) => setTargetCaseId(e.target.value)}>
              <option value="">{t('driveImport.selectCase')}</option>
              {filteredCases.map((c) => (
                <option key={c.id} value={c.id}>{c.caseNo} · {c.clientNameEn}</option>
              ))}
            </select>
            <select value={targetCategory} onChange={(e) => setTargetCategory(e.target.value as CaseDocumentCategory)}>
              {CATEGORY_KEYS.map((c) => (
                <option key={c.value} value={c.value}>{t(c.labelKey)}</option>
              ))}
            </select>
            <button type="button" className="btn-primary" disabled={selected.size === 0} onClick={assignSelected}>
              {t('driveImport.assignSelected', { count: selected.size })}
            </button>
          </div>

          {isLoading ? (
            <p className="drive-import-muted">{t('common.loading')}</p>
          ) : (
            <table className="drive-file-table">
              <thead>
                <tr>
                  <th><input type="checkbox" checked={allSelected} onChange={(e) => toggleSelectAll(e.target.checked)} /></th>
                  <th>{t('driveImport.name')}</th>
                  <th>{t('driveImport.type')}</th>
                  <th>{t('driveImport.size')}</th>
                  <th>{t('driveImport.modified')}</th>
                </tr>
              </thead>
              <tbody>
                {entries.length === 0 ? (
                  <tr><td colSpan={5} className="drive-import-muted">{t('driveImport.emptyFolder')}</td></tr>
                ) : entries.map((entry) => (
                  <tr key={entry.id} className={entry.folder ? 'drive-row-folder' : ''}>
                    <td>
                      {entry.folder ? null : (
                        <input type="checkbox" checked={selected.has(entry.id)} onChange={(e) => toggleSelect(entry.id, e.target.checked)} />
                      )}
                    </td>
                    <td>
                      {entry.folder ? (
                        <button type="button" className="drive-folder-link" onClick={() => openFolder(entry)}>
                          {fileIcon(entry)} {entry.name}
                        </button>
                      ) : (
                        <span>{fileIcon(entry)} {entry.name}{entry.exportAs ? <span className="drive-export-badge">→ {entry.exportAs}</span> : null}</span>
                      )}
                    </td>
                    <td className="drive-import-muted">{entry.folder ? t('driveImport.folder') : entry.mimeType.split('.').pop()}</td>
                    <td className="drive-import-muted">{formatSize(entry.size)}</td>
                    <td className="drive-import-muted">{entry.modifiedTime?.slice(0, 10) ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <aside className="drive-import-staging">
          <h2>{t('driveImport.staged', { count: staged.length })}</h2>
          {staged.length === 0 ? (
            <p className="drive-import-muted">{t('driveImport.stagingEmpty')}</p>
          ) : (
            <ul className="drive-staging-list">
              {staged.map((s) => (
                <li key={`${s.driveFileId}-${s.caseId}`}>
                  <div className="drive-staging-main">
                    <span className="drive-staging-name">{s.fileName}</span>
                    <span className="drive-staging-meta">{s.caseLabel} · {t(CATEGORY_KEYS.find((c) => c.value === s.category)!.labelKey)}</span>
                  </div>
                  <button type="button" className="drive-staging-remove" onClick={() => removeStaged(s.driveFileId, s.caseId)}>×</button>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            className="btn-primary drive-import-run"
            disabled={staged.length === 0 || importMutation.isPending}
            onClick={() => { setError(''); importMutation.mutate() }}
          >
            {importMutation.isPending ? t('driveImport.importing') : t('driveImport.import', { count: staged.length })}
          </button>

          {results ? (
            <div className="drive-import-results">
              <h3>{t('driveImport.results')}</h3>
              <ul>
                {results.map((r) => (
                  <li key={r.driveFileId} className={`drive-result drive-result-${r.status.toLowerCase()}`}>
                    <span>{r.fileName ?? r.driveFileId}</span>
                    <span>{t(`driveImport.status.${r.status}`)}{r.message ? ` · ${r.message}` : ''}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  )
}
