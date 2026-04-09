import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <PageLoader />
  // Demo mode: allow only if profile exists (null after logout → redirect to login)
  if (!isSupabaseConfigured) {
    return profile ? <>{children}</> : <Navigate to="/login" replace />
  }
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
