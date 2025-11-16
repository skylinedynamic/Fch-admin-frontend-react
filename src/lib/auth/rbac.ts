import { getUser } from './auth'

export function getPermissions(): string[] {
  const user = getUser() as { permissions?: unknown }
  const perms = user?.permissions
  if (Array.isArray(perms)) return perms.filter((p) => typeof p === 'string') as string[]
  return []
}

export function getRole(): string | undefined {
  const user = getUser() as { role?: unknown }
  return typeof user?.role === 'string' ? user.role : undefined
}

export function hasPermission(permission: string): boolean {
  return getPermissions().includes(permission)
}

export function hasAnyPermission(required: string[]): boolean {
  const set = new Set(getPermissions())
  return required.some((p) => set.has(p))
}

export function hasAllPermissions(required: string[]): boolean {
  const set = new Set(getPermissions())
  return required.every((p) => set.has(p))
}

export function hasRole(role: string | string[]): boolean {
  const current = getRole() || ''
  if (Array.isArray(role)) return role.includes(current)
  return current === role
}