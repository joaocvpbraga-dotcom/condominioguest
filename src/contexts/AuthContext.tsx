/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Profile } from '@/types'
import { useNavigate } from 'react-router-dom'

const DEMO_PROFILE: Profile = {
  id: 'demo',
  nome: 'Administrador Demo',
  email: 'admin@condogest.pt',
  role: 'admin',
  created_at: new Date().toISOString(),
}

interface AuthContextType {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signInDemo: () => void
  signUp: (email: string, password: string, nome: string) => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(() => (isSupabaseConfigured ? null : DEMO_PROFILE))
  const [loading, setLoading] = useState(() => isSupabaseConfigured)
  const navigate = useNavigate()

  async function fetchProfile(userId: string) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setProfile(data)
    setLoading(false)
  }

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (
      profile &&
      (profile.role === 'morador' || profile.role === 'inquilino') &&
      profile.precisa_alt
    ) {
      navigate('/alterar-password', { replace: true })
    }
  }, [profile])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  function signInDemo() {
    setProfile(DEMO_PROFILE)
  }

  async function signUp(email: string, password: string, nome: string) {
    void email
    void password
    void nome
    throw new Error('Criacao de conta desativada. Apenas administradores podem criar logins pelo painel.')
  }

  async function signOut() {
    if (!isSupabaseConfigured) {
      setProfile(null)
      return
    }
    await supabase.auth.signOut()
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, signIn, signInDemo, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
