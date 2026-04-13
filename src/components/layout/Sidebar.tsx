import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { cn, getInitials } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import {
  LayoutDashboard, Users, CreditCard, AlertTriangle,
  Megaphone, FileText, PiggyBank,
  Wrench, LogOut, Building2, Menu, X,
} from 'lucide-react'

const adminNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/moradores', icon: Users, label: 'Moradores' },
  { to: '/quotas', icon: CreditCard, label: 'Quotas' },
  { to: '/ocorrencias', icon: AlertTriangle, label: 'Ocorrências' },
  { to: '/comunicados', icon: Megaphone, label: 'Comunicados' },
  { to: '/documentos', icon: FileText, label: 'Documentos' },
  { to: '/contabilidade', icon: PiggyBank, label: 'Contabilidade' },
  { to: '/manutencoes', icon: Wrench, label: 'Manutenções' },
]

const moradorNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/quotas', icon: CreditCard, label: 'As Minhas Quotas', end: false },
  { to: '/ocorrencias', icon: AlertTriangle, label: 'Ocorrências', end: false },
  { to: '/comunicados', icon: Megaphone, label: 'Comunicados', end: false },
  { to: '/documentos', icon: FileText, label: 'Documentos', end: false },
  { to: '/contabilidade', icon: PiggyBank, label: 'Contabilidade', end: false },
  { to: '/manutencoes', icon: Wrench, label: 'Manutenções', end: false },
]

const inquilinoNavItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/ocorrencias', icon: AlertTriangle, label: 'Ocorrências', end: false },
  { to: '/comunicados', icon: Megaphone, label: 'Comunicados', end: false },
  { to: '/manutencoes', icon: Wrench, label: 'Manutenções', end: false },
]

export function Sidebar() {
  const { profile, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const roleLabel = profile?.role === 'admin' ? 'Administrador' : profile?.role === 'funcionario' ? 'Inquilino' : profile?.role === 'morador' ? 'Proprietário' : ''

  const navItems = profile?.role === 'admin'
    ? adminNavItems
    : profile?.role === 'funcionario'
      ? inquilinoNavItems
      : moradorNavItems

  const nav = (
    <>
      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        {navItems.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setOpen(false)}
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
            <p className="text-xs text-slate-400 truncate">{roleLabel}</p>
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
    </>
  )

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-4 py-3 bg-slate-900 text-white">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
            <Building2 size={17} />
          </div>
          <span className="text-base font-bold tracking-tight">CondoGest</span>
        </div>
        <button onClick={() => setOpen(v => !v)} className="p-2 rounded-lg hover:bg-slate-700 transition-colors">
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* ── Mobile drawer overlay ── */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside className={cn(
        'md:hidden fixed top-0 left-0 z-40 flex flex-col w-72 h-full bg-slate-900 text-white transition-transform duration-200',
        open ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
              <Building2 size={20} />
            </div>
            <span className="text-lg font-bold tracking-tight">CondoGest</span>
          </div>
          <button onClick={() => setOpen(false)} title="Fechar menu" aria-label="Fechar menu" className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
            <X size={18} />
          </button>
        </div>
        {nav}
      </aside>

      {/* ── Desktop sidebar ── */}
      <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-900 text-white">
        <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
          <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
            <Building2 size={20} />
          </div>
          <span className="text-lg font-bold tracking-tight">CondoGest</span>
        </div>
        {nav}
      </aside>
    </>
  )
}
