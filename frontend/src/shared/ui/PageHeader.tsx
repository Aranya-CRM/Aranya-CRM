import type { ReactNode } from 'react'
import './shared.css'

interface PageHeaderProps {
  titleZh: string
  titleEn: string
  descriptionZh?: string
  descriptionEn?: string
  actions?: ReactNode
}

export function PageHeader({
  titleZh,
  titleEn,
  descriptionZh,
  descriptionEn,
  actions,
}: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h2 className="page-title">{titleZh}</h2>
        <div className="page-subtitle">{titleEn}</div>
        {descriptionZh ? <div className="desc-zh">{descriptionZh}</div> : null}
        {descriptionEn ? <div className="desc-en">{descriptionEn}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  )
}
