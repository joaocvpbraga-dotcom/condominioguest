import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import type { UserRole } from '@/types'

interface RoleRouteProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { profile } = useAuth()

  if (!profile) return <Navigate to="/login" replace />
  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}