import { cn } from '@/utils/cn'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  description?: string
  id?: string
}

export function Switch({ checked, onChange, label, description, id }: SwitchProps) {
  const inputId = id ?? `switch-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div className="min-w-0">
        <label htmlFor={inputId} className="text-sm font-medium">
          {label}
        </label>
        {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className="-my-2 flex h-11 w-14 shrink-0 items-center justify-center rounded-full focus-ring"
      >
        <span
          className={cn(
            'relative flex h-6 w-11 items-center rounded-full border transition-colors',
            checked ? 'border-primary bg-primary/80' : 'border-border bg-muted',
          )}
        >
          <span
            className={cn(
              'absolute rounded-full bg-white shadow transition-transform',
              checked ? 'translate-x-[22px]' : 'translate-x-0.5',
            )}
            style={{ height: '1.1rem', width: '1.1rem' }}
          />
        </span>
      </button>
    </div>
  )
}
