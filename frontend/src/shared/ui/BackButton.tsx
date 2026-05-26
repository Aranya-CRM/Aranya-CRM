import './shared.css'

interface BackButtonProps {
  onClick: () => void
}

export function BackButton({ onClick }: BackButtonProps) {
  return (
    <button className="back-link" type="button" onClick={onClick}>
      ←
    </button>
  )
}
