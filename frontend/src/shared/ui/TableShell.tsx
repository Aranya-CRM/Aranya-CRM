import type { ReactNode } from 'react'
import './shared.css'

interface TableShellProps {
  children: ReactNode
}

export function TableShell({ children }: TableShellProps) {
  return <div className="table-wrap">{children}</div>
}
