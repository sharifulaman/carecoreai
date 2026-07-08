// Single source of truth for auth state on the frontend
// org_id always comes from the login response, never hardcoded

const AUTH_KEY = 'carecore_auth'

export function saveAuth(data) {
  localStorage.setItem(AUTH_KEY, JSON.stringify({
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    orgId:        data.user.org_id,    // ← from server
    role:         data.user.role,
    userId:       data.user.id,
    email:        data.user.email,
    fullName:     data.user.full_name,
    homeIds:      data.user.home_ids,
  }))
}

export function getAuth() {
  const raw = localStorage.getItem(AUTH_KEY)
  if (!raw) return null
  return JSON.parse(raw)
}

export function getOrgId() {
  return getAuth()?.orgId ?? null
}

export function getToken() {
  return getAuth()?.accessToken ?? null
}

export function getRole() {
  return getAuth()?.role ?? null
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY)
}

export function isLoggedIn() {
  const auth = getAuth()
  return !!auth?.accessToken
}