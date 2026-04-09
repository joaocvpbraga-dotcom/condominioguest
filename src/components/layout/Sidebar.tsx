import { NavLink } from 'react-router-dom'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Users, CreditCard, AlertTriangle,
  Megaphone, FileText, PiggyBank,
  Wrench, LogOut, Building2,
} from 'lucide-react'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/moradores', icon: Users, label: 'Moradores' },
  { to: '/quotas', icon: CreditCard, label: 'Quotas' },
  { to: '/ocorrencias', icon: AlertTriangle, label: 'Ocorrências' },
  { to: '/comunicados', icon: Megaphone, label: 'Comunicados' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/contabilidade', icon: PiggyBank, label: 'Contabilidade' },
  { to: '/manutencoes', icon: Wrench, label: 'Manutenções' },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()

  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
          <Building2 size={20} />
        </div>
        <span className="text-lg font-bold tracking-tight">CondoGest</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              )
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="px-4 py-4 border-t border-slate-700">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-500 text-xs font-bold shrink-0">
            {profile ? getInitials(profile.nome) : '?'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile?.nome ?? 'Utilizador'}</p>
            <p className="text-xs text-slate-400 truncate capitalize">{profile?.role ?? ''}</p>
          </div>
          <button
            onClick={signOut}
            title="Sair"
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}
