import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/utils/cn'

type ToastVariant = 'info' | 'success' | 'error'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  push: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const remove = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = Date.now() + Math.random()
      setToasts((current) => [...current.slice(-2), { id, message, variant }])
      window.setTimeout(() => remove(id), 4200)
    },
    [remove],
  )

  const value = useMemo(() => ({ push }), [push])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex flex-col items-center gap-2 px-4 md:bottom-8" aria-live="polite" aria-atomic="false">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-xl border border-border bg-popover/95 px-3 py-2.5 text-sm shadow-2xl backdrop-blur animate-fade-up',
              toast.variant === 'error' && 'border-destructive/40',
              toast.variant === 'success' && 'border-emerald-500/40',
            )}
          >
            {toast.variant === 'error' ? (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            ) : toast.variant === 'success' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            )}
            <p className="flex-1 leading-snug">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss notification"
              onClick={() => remove(toast.id)}
              className="rounded p-1 text-muted-foreground hover:text-foreground focus-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside <ToastProvider>')
  return context
}
