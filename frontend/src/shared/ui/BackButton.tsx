import './shared.css'

interface BackButtonProps {
  children: string
  onClick: () => void
}

export function BackButton({ children, onClick }: BackButtonProps) {
  return (
    <button className="back-link" type="button" onClick={onClick}>
      {children}
    </button>
  )
}
