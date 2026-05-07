interface SelectFieldProps {
  label: string
  value: string
  options: string[]
  fullWidth?: boolean
  className?: string
  onChange: (value: string) => void
}

export function SelectField({
  label,
  value,
  options,
  fullWidth = false,
  className = '',
  onChange,
}: SelectFieldProps) {
  return (
    <div className={`${className ? `${className} ` : ''}form-group${fullWidth ? ' full-width' : ''}`}>
      <label className="form-label">{label}</label>
      <select className="form-select" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </div>
  )
}
