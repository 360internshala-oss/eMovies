import { APP } from '@/config/app'

/** Namespaced, quota-safe localStorage wrapper with JSON validation. */

const key = (name: string) => `${APP.storagePrefix}:${name}`

export function readStorage<T>(name: string, fallback: T, isValid?: (value: unknown) => value is T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key(name))
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    if (isValid && !isValid(parsed)) return fallback
    return parsed as T
  } catch {
    return fallback
  }
}

export function writeStorage(name: string, value: unknown): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.localStorage.setItem(key(name), JSON.stringify(value))
    return true
  } catch {
    // Quota exceeded / private mode — the app keeps working in memory.
    return false
  }
}

export function removeStorage(name: string): void {
  try {
    window.localStorage.removeItem(key(name))
  } catch {
    /* noop */
  }
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
