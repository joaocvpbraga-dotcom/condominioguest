import { useAuth } from '@/contexts/AuthContext'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import {
  Users, CreditCard, AlertTriangle,
  TrendingUp, TrendingDown, Clock, ArrowRight,
  Megaphone, Wrench, Building2,
} from 'lucide-react'

// ── Stats ────────────────────────────────────────────────────
const stats = [
  {
    label: 'Total Moradores',
    value: '0',
    delta: 'Sem moradores registados',
    deltaUp: true,
    icon: Users,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-50',
    href: '/moradores',
  },
  {
    label: 'Quotas em Atraso',
    value: '0',
    delta: 'Sem quotas lançadas',
    deltaUp: true,
    icon: CreditCard,
    iconColor: 'text-red-500',
    iconBg: 'bg-red-50',
    href: '/quotas',
  },
  {
    label: 'Ocorrências Abertas',
    value: '0',
    delta: 'Sem ocorrências',
    deltaUp: true,
    icon: AlertTriangle,
    iconColor: 'text-yellow-600',
    iconBg: 'bg-yellow-50',
    href: '/ocorrencias',
  },

]

// ── Recent activity ──────────────────────────────────────────
type ActivityType = 'ocorrencia' | 'pagamento' | 'comunicado' | 'manutencao'

interface Activity {
  id: number
  text: string
  sub: string
  time: string
  type: ActivityType
}

const activity: Activity[] = []

const activityConfig: Record<ActivityType, { icon: React.ReactNode; bg: string; color: string }> = {
  ocorrencia: { icon: <AlertTriangle size={15} />, bg: 'bg-yellow-100', color: 'text-yellow-600' },
  pagamento: { icon: <TrendingUp size={15} />, bg: 'bg-green-100', color: 'text-green-600' },
  comunicado: { icon: <Megaphone size={15} />, bg: 'bg-purple-100', color: 'text-purple-600' },
  manutencao: { icon: <Wrench size={15} />, bg: 'bg-slate-100', color: 'text-slate-600' },
}

// ── Upcoming events ──────────────────────────────────────────
const upcoming: { id: number; label: string; date: string; tagVariant: 'warning' | 'info' | 'danger'; tag: string }[] = []

// ── Quick links ──────────────────────────────────────────────
const quickLinks = [
  { label: 'Novo comunicado', icon: Megaphone, href: '/comunicados', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
  { label: 'Registar ocorrência', icon: AlertTriangle, href: '/ocorrencias', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { label: 'Agendar manutenção', icon: Wrench, href: '/manutencoes', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
]

export function DashboardPage() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Bom dia, {profile?.nome?.split(' ')[0] ?? 'Administrador'} 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm capitalize">{today}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm shrink-0">
          <Building2 size={18} className="text-blue-600" />
          <div>
            <p className="text-xs text-slate-400 leading-none">Condomínio</p>
            <p className="text-sm font-semibold text-slate-700 leading-tight mt-0.5">Edifício Solar</p>
          </div>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map(s => (
          <button key={s.label} onClick={() => navigate(s.href)} className="text-left group">
            <Card className="hover:shadow-md hover:border-blue-100 transition-all">
              <CardBody className="flex items-center gap-4">
                <div className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${s.iconBg}`}>
                  <s.icon size={22} className={s.iconColor} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-2xl font-bold text-slate-800 leading-tight">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                  <p className={`text-xs mt-1 font-medium ${s.deltaUp ? 'text-green-600' : 'text-red-500'}`}>
                    {s.delta}
                  </p>
                </div>
                <ArrowRight size={16} className="text-slate-300 group-hover:text-blue-400 transition-colors shrink-0" />
              </CardBody>
            </Card>
          </button>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Left — 2/3 */}
        <div className="xl:col-span-2 space-y-6">

          {/* Activity feed */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">Atividade Recente</h2>
            </div>
            <ul className="divide-y divide-slate-50">
              {activity.map(item => {
                const cfg = activityConfig[item.type]
                return (
                  <li key={item.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                    <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>
                      {cfg.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700">{item.text}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0 pt-0.5">{item.time}</span>
                  </li>
                )
              })}
            </ul>
          </Card>

          {/* Financial summary */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm">Resumo Financeiro — Abril 2026</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/contabilidade')}>
                Ver detalhes <ArrowRight size={14} />
              </Button>
            </div>
            <CardBody className="grid grid-cols-3 gap-4">
              {[
                { label: 'Receitas', value: 0, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Despesas', value: 0, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Saldo Mensal', value: 0, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
              ].map(f => (
                <div key={f.label} className={`rounded-xl p-4 ${f.bg}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <f.icon size={15} className={f.color} />
                    <p className="text-xs font-medium text-slate-600">{f.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${f.color}`}>{formatCurrency(f.value)}</p>
                </div>
              ))}
            </CardBody>
          </Card>
        </div>

        {/* Right — 1/3 */}
        <div className="space-y-6">

          {/* Quick actions */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm">Ações Rápidas</h2>
            </div>
            <CardBody className="p-3 grid grid-cols-2 gap-2">
              {quickLinks.map(ql => (
                <button
                  key={ql.label}
                  onClick={() => navigate(ql.href)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-medium transition-colors ${ql.color}`}
                >
                  <ql.icon size={20} />
                  <span className="text-center leading-tight">{ql.label}</span>
                </button>
              ))}
            </CardBody>
          </Card>

          {/* Upcoming events */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Clock size={15} className="text-slate-400" />
              <h2 className="font-semibold text-slate-800 text-sm">Próximos Eventos</h2>
            </div>
            <ul className="divide-y divide-slate-50">
              {upcoming.map(u => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-12 shrink-0 text-center">
                    <p className="text-sm font-bold text-blue-600 leading-none">{u.date.split(' ')[0]}</p>
                    <p className="text-xs text-slate-400 leading-none mt-0.5">{u.date.split(' ')[1]}</p>
                  </div>
                  <div className="w-px h-8 bg-slate-100 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-700 truncate">{u.label}</p>
                    <Badge variant={u.tagVariant} className="mt-1">{u.tag}</Badge>
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {/* Occupancy bars */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm">Ocupação do Edifício</h2>
            </div>
            <CardBody className="space-y-4">
              {[
                { label: 'Frações ocupadas', value: 44, total: 48, color: 'bg-blue-500' },
                { label: 'Quotas pagas (Abr)', value: 41, total: 48, color: 'bg-green-500' },
                { label: 'Espaços disponíveis', value: 3, total: 4, color: 'bg-purple-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-700">{item.value}/{item.total}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${item.color}`}
                      style={{ width: `${Math.round((item.value / item.total) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardBody>
          </Card>

        </div>
      </div>
    </div>
  )
}


