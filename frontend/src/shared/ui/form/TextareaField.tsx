interface TextareaFieldProps {
  label: string
  value: string
  fullWidth?: boolean
  className?: string
  onChange: (value: string) => void
}

export function TextareaField({
  label,
  value,
  fullWidth = false,
  className = '',
  onChange,
}: TextareaFieldProps) {
  return (
    <div className={`${className ? `${className} ` : ''}form-group${fullWidth ? ' full-width' : ''}`}>
      <label className="form-label">{label}</label>
      <textarea className="form-textarea" value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
