import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { isSupabaseConfigured } from '@/lib/supabase'
import { PageLoader } from '@/components/ui/Spinner'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  if (loading) return <PageLoader />
  // Demo mode (no Supabase): allow through if profile exists
  if (!isSupabaseConfigured && profile) return <>{children}</>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
