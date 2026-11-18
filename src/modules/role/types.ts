// Role module TypeScript types

export type Role = {
  id: number | string
  name: string
  description?: string
  code: string,
  is_static: boolean,
  /** For the signed-in viewer (fch-api Role::isEditableBy): a Developer may change Admin, no one the Developer role. */
  is_editable: boolean,
  permissions: string[]
  users_count?: number
}

// Permission item as returned by backend (id optional)
export type ApiPermission = {
  id?: number
  name: string
}

// Grouped permissions by module
export type ApiModulePermissions = {
  module: string
  permissions: ApiPermission[]
}

// If backend returns object mapping, we normalize to ApiModulePermissions[] in services
export type GroupedPermissionsObject = Record<string, Array<string | ApiPermission>>

// Payload for creating a role
export type CreateRolePayload = {
  name: string
  description?: string
  permission_ids: number[]
}

// Role details response shape (for /common/roles/{role_id})
export type RoleDetailUser = {
  id: number
  name: string
  email: string
  phone_number: string
  role: string
  status: string
  image?: string | null
}

export type RoleDetail = {
  id: number | string
  name: string
  description?: string
  permission: string[]
  // Optional permission IDs when backend provides an id->name map
  permission_ids?: number[]
  users: RoleDetailUser[]
  /** A system role (Admin, Developer): its name is fixed (R2 BUG-011). */
  is_static: boolean
  /**
   * Whether the viewer may change it (fch-api Role::isEditableBy): a static role
   * only a Developer, and the Developer role no one. Read-only when false.
   */
  is_editable: boolean
}