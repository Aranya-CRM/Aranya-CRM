import type { ReactNode } from 'react'
import './shared.css'

interface SectionCardProps {
  title?: string
  ariaLabel?: string
  children: ReactNode
  bodyPadding?: boolean
  className?: string
}

export function SectionCard({
  title,
  ariaLabel,
  children,
  bodyPadding = false,
  className = '',
}: SectionCardProps) {
  return (
    <section className={`card${className ? ` ${className}` : ''}`} aria-label={ariaLabel}>
      {title ? (
        <div className="card-header">
          <div className="card-title">{title}</div>
        </div>
      ) : null}
      <div className={bodyPadding ? 'card-body' : undefined}>
        {children}
      </div>
    </section>
  )
}
