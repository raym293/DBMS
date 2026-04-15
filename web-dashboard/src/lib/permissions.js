export const VIEW_RESOURCES = ['dashboard', 'commits', 'branches', 'users']

export const ROLE_VIEW_RIGHTS = {
  admin: ['dashboard', 'commits', 'branches', 'users'],
  user: ['dashboard', 'commits', 'branches'],
  viewer: ['dashboard', 'commits'],
}

export function normalizeRole(role) {
  const normalized = String(role || '').trim().toLowerCase()
  if (normalized in ROLE_VIEW_RIGHTS) {
    return normalized
  }
  return 'viewer'
}

export function getRoleViewRights(role) {
  const normalized = normalizeRole(role)
  return ROLE_VIEW_RIGHTS[normalized]
}

export function mergeViewRights(role, accessControlRows = []) {
  const rights = new Set(getRoleViewRights(role))

  for (const row of accessControlRows) {
    const resource = row?.resource
    const permissionType = row?.permission_type
    if (
      VIEW_RESOURCES.includes(resource) &&
      (permissionType === 'read' || permissionType === 'admin')
    ) {
      rights.add(resource)
    }
  }

  return Array.from(rights)
}
