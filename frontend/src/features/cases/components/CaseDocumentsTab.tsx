import { useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Upload } from 'antd'
import type { UploadProps } from 'antd'
import { useAccess } from '../../../shared/auth/useAccess'

/**
 * 案例「文件」标签 —— 静态演示版(单页平铺,按 4 类分区)。
 * 取消二级入口:每个分类一个标题分区,文件直接列在标题下。
 * 上传为按钮 -> 弹窗(拖拽框 + 可选自定义文件名)。AntD Upload 阻断真实上传。
 * 后续接数据时把 SAMPLE_DOCS 换成 useCaseDocuments(caseId) 的返回即可。
 */

type CategoryKey = 'ordination' | 'medical' | 'financial' | 'legal'

const CATEGORY_DEFS: { key: CategoryKey; icon: string }[] = [
  { key: 'ordination', icon: '📜' },
  { key: 'medical', icon: '🩺' },
  { key: 'financial', icon: '💰' },
  { key: 'legal', icon: '⚖' },
]

interface DemoDocument {
  id: string
  category: CategoryKey
  fileName: string
  mimeType: string
  fileSize: number
  uploadedByName: string
  uploadedAt: string
  /** 预览/下载 URL。真实环境由后端 presigned URL 提供;静态演示仅图片给占位。 */
  previewUrl?: string
}

/** 静态演示用:返回一张内联 SVG 占位图(模拟扫描件),让图片预览真实可见。 */
function placeholderImage(label: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='640' height='440'>
    <rect width='100%' height='100%' fill='#f3effc'/>
    <rect x='40' y='40' width='560' height='360' rx='10' fill='#fff' stroke='#d6cdf0' stroke-width='2'/>
    <text x='320' y='210' font-family='sans-serif' font-size='30' fill='#6d28d9' text-anchor='middle'>${label}</text>
    <text x='320' y='250' font-family='sans-serif' font-size='15' fill='#9b8fc4' text-anchor='middle'>image preview (demo)</text>
  </svg>`
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const SAMPLE_DOCS: DemoDocument[] = [
  { id: 'd1', category: 'ordination', fileName: 'Ordination_Certificate.jpg', mimeType: 'image/jpeg', fileSize: 1_843_200, uploadedByName: 'Mei Ling', uploadedAt: '2026-06-18 09:05', previewUrl: placeholderImage('Ordination_Certificate.jpg') },
  { id: 'd2', category: 'ordination', fileName: 'Ordination_Record.pdf', mimeType: 'application/pdf', fileSize: 962_560, uploadedByName: 'Mei Ling', uploadedAt: '2026-06-18 09:07' },
  { id: 'd3', category: 'medical', fileName: 'Medical_Report_2026Q2.pdf', mimeType: 'application/pdf', fileSize: 3_276_800, uploadedByName: 'Shi Du', uploadedAt: '2026-06-12 16:48' },
  { id: 'd4', category: 'medical', fileName: 'Health_Assessment.docx', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', fileSize: 56_320, uploadedByName: 'Wei Jie', uploadedAt: '2026-06-05 11:20' },
  { id: 'd5', category: 'financial', fileName: 'Financial_Assistance_Application.pdf', mimeType: 'application/pdf', fileSize: 421_888, uploadedByName: 'Shi Du', uploadedAt: '2026-06-03 10:02' },
  { id: 'd6', category: 'financial', fileName: 'Bank_Statement_May.pdf', mimeType: 'application/pdf', fileSize: 188_416, uploadedByName: 'Shi Du', uploadedAt: '2026-06-03 10:05' },
  { id: 'd7', category: 'legal', fileName: 'Will_signed.pdf', mimeType: 'application/pdf', fileSize: 248_512, uploadedByName: 'Shi Du', uploadedAt: '2026-05-28 15:11' },
  { id: 'd8', category: 'legal', fileName: 'LPA_Form.pdf', mimeType: 'application/pdf', fileSize: 312_320, uploadedByName: 'Shi Du', uploadedAt: '2026-05-28 15:14' },
  { id: 'd9', category: 'legal', fileName: 'ACP_Record.pdf', mimeType: 'application/pdf', fileSize: 134_144, uploadedByName: 'Wei Jie', uploadedAt: '2026-05-20 11:30' },
]

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith('image/')) return '🖼'
  if (mimeType === 'application/pdf') return '📕'
  if (mimeType.includes('word') || mimeType.includes('document')) return '📘'
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return '📗'
  return '📄'
}

/** 预览弹窗 —— 按 mimeType 分发:图片 <img> / PDF <iframe> / 其它(Office)降级下载。 */
function PreviewModal({ doc, onClose }: { doc: DemoDocument; onClose: () => void }) {
  const { t } = useTranslation()
  const isImage = doc.mimeType.startsWith('image/')
  const isPdf = doc.mimeType === 'application/pdf'

  let body: ReactNode
  if (isImage && doc.previewUrl) {
    body = <img className="case-document-preview-img" src={doc.previewUrl} alt={doc.fileName} />
  } else if (isPdf) {
    body = doc.previewUrl ? (
      <iframe className="case-document-preview-frame" src={doc.previewUrl} title={doc.fileName} />
    ) : (
      <div className="case-document-preview-placeholder">
        <span className="case-document-preview-placeholder-icon">📄</span>
        <p>{t('cases.documents.previewDemoHint')}</p>
      </div>
    )
  } else {
    // Office 等浏览器无法内联渲染的格式 —— 降级为下载
    body = (
      <div className="case-document-preview-fallback">
        <span className="case-document-preview-placeholder-icon">{fileIcon(doc.mimeType)}</span>
        <p>{t('cases.documents.previewUnsupported')}</p>
        <button type="button" className="btn-primary">{t('cases.documents.download')}</button>
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
          <button className="btn-primary" type="button">{t('cases.documents.download')}</button>
        </footer>
      </div>
    </div>
  )
}

/** 上传弹窗 —— 静态演示:拖拽框 + 可选自定义文件名,确认为占位。 */
function UploadModal({ onClose }: { onClose: () => void }) {
  const { t } = useTranslation()
  const [customName, setCustomName] = useState('')

  const uploadProps: UploadProps = {
    multiple: true,
    beforeUpload: () => false,
    showUploadList: true,
  }

  return (
    <div className="event-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <div className="event-modal case-document-upload-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="event-modal-header">
          <h2>{t('cases.documents.upload')}</h2>
          <button type="button" className="event-modal-close" aria-label="Close" onClick={onClose}>×</button>
        </header>

        <div className="event-modal-body">
          <Upload.Dragger {...uploadProps} className="case-document-dragger">
            <p className="case-document-dragger-icon">⬆</p>
            <p className="case-document-dragger-text">{t('cases.documents.uploadHint')}</p>
            <p className="case-document-dragger-hint">{t('cases.documents.uploadHintSub')}</p>
          </Upload.Dragger>

          <label className="case-document-name-field">
            <span>{t('cases.documents.fileNameLabel')}</span>
            <input
              value={customName}
              placeholder={t('cases.documents.fileNamePlaceholder')}
              onChange={(e) => setCustomName(e.target.value)}
            />
          </label>
        </div>

        <footer className="event-modal-footer">
          <button className="btn-secondary" type="button" onClick={onClose}>{t('common.cancel')}</button>
          <button className="btn-primary" type="button" onClick={onClose}>{t('cases.documents.upload')}</button>
        </footer>
      </div>
    </div>
  )
}

export function CaseDocumentsTab(_props: { caseId: string }) {
  const { t } = useTranslation()
  const { resolve } = useAccess()
  const canUpload = resolve('cases:documents.upload')
  const canDelete = resolve('cases:documents.delete')
  const [showUpload, setShowUpload] = useState(false)
  const [previewDoc, setPreviewDoc] = useState<DemoDocument | null>(null)

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

      {CATEGORY_DEFS.map(({ key, icon }) => {
        const docs = SAMPLE_DOCS.filter((d) => d.category === key)
        return (
          <section className={`case-document-section case-document-section--${key}`} key={key}>
            <div className="case-document-section-head">
              <span className="case-document-section-icon">{icon}</span>
              <span className="case-document-section-title">{t(`cases.documents.category.${key}`)}</span>
              <span className="case-document-section-count">{t('cases.documents.count', { count: docs.length })}</span>
            </div>

            {docs.length === 0 ? (
              <p className="case-placeholder-text case-document-section-empty">{t('cases.documents.empty')}</p>
            ) : (
              <div className="case-document-list">
                {docs.map((doc) => (
                  <div
                    key={doc.id}
                    className="case-document-item clickable"
                    role="button"
                    tabIndex={0}
                    onClick={() => setPreviewDoc(doc)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPreviewDoc(doc) } }}
                  >
                    <span className="case-document-icon">{fileIcon(doc.mimeType)}</span>
                    <div className="case-document-main">
                      <span className="case-document-name">{doc.fileName}</span>
                      <span className="case-document-meta">
                        {formatFileSize(doc.fileSize)} · {doc.uploadedByName} · {doc.uploadedAt}
                      </span>
                    </div>
                    <div className="case-document-actions">
                      <button type="button" className="btn-document-action" onClick={(e) => e.stopPropagation()}>{t('cases.documents.download')}</button>
                      {canDelete ? (
                        <button type="button" className="btn-document-action danger" onClick={(e) => e.stopPropagation()}>{t('cases.documents.delete')}</button>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )
      })}

      {showUpload ? <UploadModal onClose={() => setShowUpload(false)} /> : null}
      {previewDoc ? <PreviewModal doc={previewDoc} onClose={() => setPreviewDoc(null)} /> : null}
    </div>
  )
}
