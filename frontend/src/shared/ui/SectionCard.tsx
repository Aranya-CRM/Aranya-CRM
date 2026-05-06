import type { ReactNode } from 'react'
import './shared.css'

interface SectionCardProps {
  titleZh?: string
  titleEn?: string
  ariaLabel?: string
  children: ReactNode
  bodyPadding?: boolean
  className?: string
}

export function SectionCard({
  titleZh,
  titleEn,
  ariaLabel,
  children,
  bodyPadding = false,
  className = '',
}: SectionCardProps) {
  const hasHeader = Boolean(titleZh || titleEn)

  return (
    <section className={`card${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      {hasHeader ? (
        <div className="card-header">
          {titleZh ? <div className="card-title">{titleZh}</div> : null}
          {titleEn ? <div className="card-subtitle">{titleEn}</div> : null}
        </div>
      ) : null}
      <div className={bodyPadding ? 'card-body' : undefined}>
        {children}
      </div>
    </section>
  )
}
