interface TextFieldProps {
  label: string
  value: string
  type?: 'text' | 'date' | 'number'
  fullWidth?: boolean
  className?: string
  onChange: (value: string) => void
}

export function TextField({
  label,
  value,
  type = 'text',
  fullWidth = false,
  className = '',
  onChange,
}: TextFieldProps) {
  return (
    <div className={`${className ? `${className} ` : ''}form-group${fullWidth ? ' full-width' : ''}`}>
      <label className="form-label">{label}</label>
      <input className="form-input" type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </div>
  )
}
