import { useCallback, useEffect, useRef, useState } from 'react'
import { isAborted } from '@/services/apiClient'

export interface AsyncState<T> {
  data: T | null
  error: unknown
  loading: boolean
  /** true while a re-fetch is in flight but previous data is still shown */
  refreshing: boolean
}

/**
 * Runs an async task, cancels the previous run when dependencies change and
 * ignores results from stale runs. Callers receive an AbortSignal.
 */
export function useAsync<T>(
  task: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
  options: { enabled?: boolean } = {},
) {
  const { enabled = true } = options
  const [state, setState] = useState<AsyncState<T>>({ data: null, error: null, loading: enabled, refreshing: false })
  const taskRef = useRef(task)
  taskRef.current = task
  const [nonce, setNonce] = useState(0)
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState({ data: null, error: null, loading: false, refreshing: false })
      return
    }
    const controller = new AbortController()
    let active = true

    setState((current) => ({
      data: current.data,
      error: null,
      loading: current.data === null,
      refreshing: current.data !== null,
    }))

    taskRef
      .current(controller.signal)
      .then((data) => {
        if (!active || controller.signal.aborted) return
        setState({ data, error: null, loading: false, refreshing: false })
      })
      .catch((error: unknown) => {
        if (!active || controller.signal.aborted || isAborted(error)) return
        setState((current) => ({ data: current.data, error, loading: false, refreshing: false }))
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce])

  const reload = useCallback(() => setNonce((value) => value + 1), [])

  return { ...state, reload, setData: (data: T) => setState((current) => ({ ...current, data })) }
}
