interface CheckboxRowProps {
  checked: boolean
  label: string
  onChange: (checked: boolean) => void
}

export function CheckboxRow({ checked, label, onChange }: CheckboxRowProps) {
  return (
    <div className="form-checkbox-row">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>{label}</span>
    </div>
  )
}
