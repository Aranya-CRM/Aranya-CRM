import './shared.css'

interface MessageProps {
  message: string
}

export function ErrorBanner({ message }: MessageProps) {
  return <div className="error-banner">{message}</div>
}

export function EmptyState({ message }: MessageProps) {
  return <div className="empty-state">{message}</div>
}

interface EmptyTableRowProps extends MessageProps {
  colSpan: number
}

export function EmptyTableRow({ colSpan, message }: EmptyTableRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="empty-state">
        {message}
      </td>
    </tr>
  )
}
