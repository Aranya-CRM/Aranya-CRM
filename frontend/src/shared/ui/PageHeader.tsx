import type { ReactNode } from 'react'
import './shared.css'

interface PageHeaderProps {
  title: string
  subtitle?: string
  description?: string
  actions?: ReactNode
}

export function PageHeader({ title, subtitle, description, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      <div>
        <h2 className="page-title">{title}</h2>
        {subtitle ? <div className="page-subtitle">{subtitle}</div> : null}
        {description ? <div className="desc-en">{description}</div> : null}
      </div>
      {actions ? <div className="page-header-actions">{actions}</div> : null}
    </div>
  )
}
