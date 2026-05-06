import type { ReactNode } from 'react'

interface InfoItemProps {
  label: string
  value: ReactNode
}

export function InfoItem({ label, value }: InfoItemProps) {
  const display = value === undefined || value === '' ? '—' : typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value

  return (
    <div className="info-item">
      <span className="info-label">{label}</span>
      <span className="info-value">{display}</span>
    </div>
  )
}
