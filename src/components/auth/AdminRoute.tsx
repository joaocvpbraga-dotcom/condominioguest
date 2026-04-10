import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  if (profile && profile.role !== 'admin') {
    return <Navigate to="/ocorrencias" replace />
  }
  return <>{children}</>
}
