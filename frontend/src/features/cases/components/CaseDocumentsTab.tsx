import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'antd'
import type { UploadFile, UploadProps } from 'antd'
import { getApiErrorCode, getApiErrorMessage } from '../../../shared/api/errors'
import { useAccess } from '../../../shared/auth/useAccess'
import type { CaseDocument, CaseDocumentCategory } from '../types'
import { useCaseDocumentDownloadUrl, useCaseDocuments, useDeleteCaseDocument, useUploadCaseDocument } from '../hooks/useCases'

type CategoryKey = 'ordination' | 'medical' | 'financial' | 'legal'

const CATEGORY_DEFS: { key: CategoryKey; apiCategory: CaseDocumentCategory; icon: string }[] = [
  { key: 'ordination', apiCategory: 'ORDINATION', icon: '📜' },
  { key: 'medical', apiCategory: 'MEDICAL', icon: '🩺' },
  { key: 'financial', apiCategory: 'FINANCIAL', icon: '💰' },
  { key: 'legal', apiCategory: 'LEGAL', icon: '⚖' },
]

type PreviewDocument = CaseDocument & { previewUrl?: string }
type SelectedUploadFile = NonNullable<UploadFile['originFileObj']>

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatUploadedAt(value: string): string {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 16)
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📗'
  return '📄'
}

function downloadUrl(url: string, fileName: string) {
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.style.display = 'none'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

function documentActionError(error: unknown, fallback: string, translate: (key: string) => string): string {
  const code = getApiErrorCode(error)
  if (code === 'FILE_STORAGE_UNAVAILABLE') return translate('cases.documents.storageUnavailable')
  if (code === 'FILE_TOO_LARGE') return translate('cases.documents.fileTooLarge')
  return getApiErrorMessage(error) ?? fallback
}

function PreviewModal({
  doc,
  onClose,
  onDownload,
}: {
  doc: PreviewDocument
  onClose: () => void
  onDownload: (doc: CaseDocument) => void
}) {
  const { t } = useTranslation()
  const isImage = doc.mimeType.startsWith('image/')
  const isPdf = doc.mimeType === 'application/pdf'

  let body: ReactNode
  if (isImage && doc.previewUrl) {
    body = <img className="case-document-preview-img" src={doc.previewUrl} alt={doc.fileName} />
  } else if (isPdf && doc.previewUrl) {
    body = <iframe className="case-document-preview-frame" src={doc.previewUrl} title={doc.fileName} />
  } else {
    body = (
      <div className="case-document-preview-fallback">
        <span className="case-document-preview-placeholder-icon">{fileIcon(doc.mimeType)}</span>
        <p>{t('cases.documents.previewUnsupported')}</p>
        <button type="button" className="btn-primary" onClick={() => onDownload(doc)}>{t('cases.documents.download')}</button>
      </div>
    )
  }

  return (
    <div className="event-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="event-modal case-document-preview-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="event-modal-header">
          <h2 className="case-document-preview-title">{fileIcon(doc.mimeType)} {doc.fileName}</h2>
          <button type="button" className="event-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>
        <div className="event-modal-body case-document-preview-body">{body}</div>
        <footer className="event-modal-footer">
          <button className="btn-secondary" type="button" onClick={onClose}>{t('common.close')}</button>
          <button className="btn-primary" type="button" onClick={() => onDownload(doc)}>{t('cases.documents.download')}</button>
        </footer>
      </div>
    </div>
  )
}

function UploadModal({
  onClose,
  onUpload,
  isUploading,
}: {
  onClose: () => void
  onUpload: (category: CaseDocumentCategory, files: File[], displayName?: string) => Promise<void>
  isUploading: boolean
}) {
  const { t } = useTranslation()
  const [customName, setCustomName] = useState('')
  const [category, setCategory] = useState<CaseDocumentCategory>('ORDINATION')
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const uploadProps: UploadProps = {
    multiple: true,
    beforeUpload: () => false,
    fileList,
    onChange: (info) => setFileList(info.fileList),
    showUploadList: true,
  }

  const selectedFiles = fileList
    .map((item) => item.originFileObj)
    .filter((file): file is SelectedUploadFile => Boolean(file))

  const submit = async () => {
    if (selectedFiles.length === 0) return
    await onUpload(category, selectedFiles, selectedFiles.length === 1 ? customName : undefined)
    onClose()
  }

  return (
    <div className="event-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="event-modal case-document-upload-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="event-modal-header">
          <h2>{t('cases.documents.upload')}</h2>
          <button type="button" className="event-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <div className="event-modal-body">
          <label className="case-document-name-field">
            <span>{t('cases.documents.categoryLabel')}</span>
            <select value={category} onChange={(e) => setCategory(e.target.value as CaseDocumentCategory)}>
              {CATEGORY_DEFS.map((item) => (
                <option key={item.apiCategory} value={item.apiCategory}>
                  {t(`cases.documents.category.${item.key}`)}
                </option>
              ))}
            </select>
          </label>

          <Upload.Dragger {...uploadProps} className="case-document-dragger">
            <p className="case-document-dragger-icon">⬆</p>
            <p className="case-document-dragger-text">{t('cases.documents.uploadHint')}</p>
            <p className="case-document-dragger-hint">{t('cases.documents.uploadHintSub')}</p>
          </Upload.Dragger>

          <label className="case-document-name-field">
            <span>{t('cases.documents.fileNameLabel')}</span>
            <input
              value={customName}
              disabled={selectedFiles.length > 1}
              placeholder={t('cases.documents.fileNamePlaceholder')}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
        </div>

        <footer className="event-modal-footer">
          <button className="btn-secondary" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" type="button" disabled={selectedFiles.length === 0 || isUploading} onClick={submit}>
            {isUploading ? t('common.loading') : t('cases.documents.upload')}
          </button>
        </footer>
      </div>
    </div>
  )
}

export function CaseDocumentsTab({ caseId }: { caseId: string }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const canUpload = resolve('cases:documents.upload')
  const canDelete = resolve('cases:documents.delete')
  const { data = [], isLoading, isError } = useCaseDocuments(caseId)
  const uploadMutation = useUploadCaseDocument(caseId)
  const deleteMutation = useDeleteCaseDocument(caseId)
  const downloadMutation = useCaseDocumentDownloadUrl(caseId)
  const [showUpload, setShowUpload] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<PreviewDocument | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const documentsByCategory = useMemo(() => {
    return CATEGORY_DEFS.reduce<Record<CaseDocumentCategory, CaseDocument[]>>((acc, item) => {
      acc[item.apiCategory] = data.filter((doc) => doc.category === item.apiCategory)
      return acc
    }, { ORDINATION: [], MEDICAL: [], FINANCIAL: [], LEGAL: [] })
  }, [data])

  const handleDownload = async (doc: CaseDocument) => {
    setActionError(null)
    try {
      const result = await downloadMutation.mutateAsync(doc.documentId)
      downloadUrl(result.url, result.fileName || doc.fileName)
    } catch (error) {
      setActionError(documentActionError(error, t('cases.documents.downloadError'), t))
    }
  }

  const handlePreview = async (doc: CaseDocument) => {
    if (!doc.mimeType.startsWith('image/') && doc.mimeType !== 'application/pdf') {
      setPreviewDoc(doc)
      return
    }
    setActionError(null)
    try {
      const result = await downloadMutation.mutateAsync({ documentId: doc.documentId, disposition: 'inline' })
      setPreviewDoc({ ...doc, previewUrl: result.url })
    } catch (error) {
      setActionError(documentActionError(error, t('cases.documents.downloadError'), t))
    }
  }

  const handleUpload = async (category: CaseDocumentCategory, files: File[], displayName?: string) => {
    setActionError(null)
    try {
      for (const file of files) {
        await uploadMutation.mutateAsync({ category, file, displayName })
      }
    } catch (error) {
      setActionError(documentActionError(error, t('cases.documents.uploadError'), t))
      throw new Error('Upload failed')
    }
  }

  const handleDelete = async (doc: CaseDocument) => {
    if (!window.confirm(t('cases.documents.deleteConfirm'))) return
    setActionError(null)
    try {
      await deleteMutation.mutateAsync(doc.documentId)
    } catch (error) {
      setActionError(documentActionError(error, t('cases.documents.deleteError'), t))
    }
  }

  return (
    <div className="case-document-tab">
      <div className="case-document-toolbar">
        <span className="case-document-list-head">{t('cases.documents.title')}</span>
        {canUpload ? (
          <button type="button" className="btn-primary case-document-upload-btn" onClick={() => setShowUpload(true)}>
            ⬆ {t('cases.documents.upload')}
          </button>
        ) : null}
      </div>

      {actionError ? <p className="case-placeholder-text">{actionError}</p> : null}
      {isError ? <p className="case-placeholder-text">{t('cases.documents.loadError')}</p> : null}

      {CATEGORY_DEFS.map(({ key, apiCategory, icon }) => {
        const docs = documentsByCategory[apiCategory]
        return (
          <section className={`case-document-section case-document-section--${key}`} key={key}>
            <div className="case-document-section-head">
              <span className="case-document-section-icon">{icon}</span>
              <span className="case-document-section-title">{t(`cases.documents.category.${key}`)}</span>
              <span className="case-document-section-count">{t('cases.documents.count', { count: docs.length })}</span>
            </div>

            {isLoading ? (
              <p className="case-placeholder-text case-document-section-empty">{t('common.loading')}</p>
            ) : docs.length === 0 ? (
              <p className="case-placeholder-text case-document-section-empty">{t('cases.documents.empty')}</p>
            ) : (
              <div className="case-document-list">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="case-document-item clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => handlePreview(doc)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handlePreview(doc) } }}
                  >
                    <span className="case-document-icon">{fileIcon(doc.mimeType)}</span>
                    <div className="case-document-main">
                      <span className="case-document-name">{doc.fileName}</span>
                      <span className="case-document-meta">
                        {formatFileSize(doc.fileSize)} · {doc.uploadedByName || '-'} · {formatUploadedAt(doc.uploadedAt)}
                      </span>
                    </div>
                    <div className="case-document-actions">
                      <button type="button" className="btn-document-action" onClick={(e) => { e.stopPropagation(); handleDownload(doc) }}>{t('cases.documents.download')}</button>
                      {canDelete ? (
                        <button type="button" className="btn-document-action danger" onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}>{t('cases.documents.delete')}</button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      {showUpload ? (
        <UploadModal
          onClose={() => setShowUpload(false)}
          onUpload={handleUpload}
          isUploading={uploadMutation.isPending}
        />
      ) : null}
      {previewDoc ? <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} onDownload={handleDownload} /> : null}
    </div>
  )
}
