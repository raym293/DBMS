import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { mergeViewRights, normalizeRole } from '../lib/permissions.js'

const AuthzContext = createContext(null)

function deriveUsername(user) {
  const metadataUsername = user?.user_metadata?.username
  if (metadataUsername) return metadataUsername

  const email = user?.email || ''
  if (email.includes('@')) {
    return email.split('@')[0]
  }

  return 'user'
}

export function AuthzProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [viewRights, setViewRights] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true

    async function bootstrap() {
      setLoading(true)
      setError(null)

      const { data, error: sessionError } = await supabase.auth.getSession()
      if (!active) return
      if (sessionError) {
        setError(sessionError.message)
        setLoading(false)
        return
      }

      const currentSession = data?.session || null
      setSession(currentSession)
      const currentUser = currentSession?.user || null
      setUser(currentUser)

      if (!currentUser) {
        setProfile(null)
        setViewRights([])
        setLoading(false)
        return
      }

      await hydrateAuthorization(currentUser, active)
    }

    bootstrap()

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return

      setSession(nextSession)
      const nextUser = nextSession?.user || null
      setUser(nextUser)
      setError(null)

      if (!nextUser) {
        setProfile(null)
        setViewRights([])
        setLoading(false)
        return
      }

      setLoading(true)
      await hydrateAuthorization(nextUser, active)
    })

    return () => {
      active = false
      listener?.subscription?.unsubscribe()
    }
  }, [])

  async function hydrateAuthorization(currentUser, active) {
    try {
      const ensuredProfile = await ensureProfile(currentUser)
      if (!active) return

      const grants = await fetchOwnPermissions(currentUser.id)
      if (!active) return

      const effectiveRole = normalizeRole(ensuredProfile?.role)
      setProfile({ ...ensuredProfile, role: effectiveRole })
      setViewRights(mergeViewRights(effectiveRole, grants))
      setLoading(false)
    } catch (hydrateError) {
      if (!active) return
      setError(hydrateError.message)
      setProfile(null)
      setViewRights([])
      setLoading(false)
    }
  }

  async function ensureProfile(currentUser) {
    const { data, error: selectError } = await supabase
      .from('users')
      .select('id, email, username, role, created_at, updated_at')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (selectError) {
      throw new Error(`Failed to load user profile: ${selectError.message}`)
    }

    if (data) {
      return data
    }

    const username = deriveUsername(currentUser)
    const { data: inserted, error: insertError } = await supabase
      .from('users')
      .insert({
        id: currentUser.id,
        email: currentUser.email,
        username,
        role: 'user',
      })
      .select('id, email, username, role, created_at, updated_at')
      .single()

    if (insertError) {
      throw new Error(`Failed to create user profile: ${insertError.message}`)
    }

    return inserted
  }

  async function fetchOwnPermissions(userId) {
    const { data, error: permissionsError } = await supabase
      .from('access_control')
      .select('resource, permission_type')
      .eq('user_id', userId)

    if (permissionsError) {
      throw new Error(`Failed to load permissions: ${permissionsError.message}`)
    }

    return data || []
  }

  async function signOut() {
    const { error: signOutError } = await supabase.auth.signOut()
    if (signOutError) {
      throw new Error(signOutError.message)
    }
  }

  const value = useMemo(() => {
    const role = normalizeRole(profile?.role)
    return {
      session,
      user,
      profile,
      role,
      viewRights,
      loading,
      error,
      canView: (resource) => viewRights.includes(resource),
      signOut,
    }
  }, [session, user, profile, viewRights, loading, error])

  return <AuthzContext.Provider value={value}>{children}</AuthzContext.Provider>
}

export function useAuthz() {
  const context = useContext(AuthzContext)
  if (!context) {
    throw new Error('useAuthz must be used within AuthzProvider')
  }
  return context
}
