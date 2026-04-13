import { useAuth } from '@/contexts/AuthContext'
import { useAppData } from '@/contexts/AppDataContext'
import { Card, CardBody } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { formatCurrency, formatDate } from '@/lib/utils'
import { Navigate, useNavigate } from 'react-router-dom'
import {
  Users, CreditCard, AlertTriangle,
  TrendingUp, TrendingDown, Clock, ArrowRight,
  Megaphone, Wrench, Building2, ShieldAlert, Bell,
} from 'lucide-react'

type ActivityType = 'ocorrencia' | 'pagamento' | 'comunicado' | 'manutencao'
const activityConfig: Record<ActivityType, { icon: React.ReactNode; bg: string; color: string }> = {
  ocorrencia: { icon: <AlertTriangle size={15} />, bg: 'bg-yellow-100', color: 'text-yellow-600' },
  pagamento: { icon: <TrendingUp size={15} />, bg: 'bg-green-100', color: 'text-green-600' },
  comunicado: { icon: <Megaphone size={15} />, bg: 'bg-purple-100', color: 'text-purple-600' },
  manutencao: { icon: <Wrench size={15} />, bg: 'bg-slate-100', color: 'text-slate-600' },
}
const quickLinks = [
  { label: 'Novo comunicado', icon: Megaphone, href: '/comunicados', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
  { label: 'Registar ocorrência', icon: AlertTriangle, href: '/ocorrencias', color: 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100' },
  { label: 'Agendar manutenção', icon: Wrench, href: '/manutencoes', color: 'bg-orange-50 text-orange-700 hover:bg-orange-100' },
]

export function DashboardPage() {
  const { profile } = useAuth()
  const { moradores, quotas, ocorrencias, comunicados, manutencoes, fracoes, rubricas, documentos } = useAppData()
  const navigate = useNavigate()
  const today = new Date().toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const isAdmin = profile?.role === 'admin'
  const roleValue = profile?.role as string | undefined
  const isInquilino = roleValue === 'inquilino' || roleValue === 'funcionario'
  const precisaFracao = profile?.role === 'morador' || isInquilino
  const temFracaoAssociada = !!profile?.id && fracoes.some(f => f.proprietario_id === profile.id)

  if (precisaFracao && !temFracaoAssociada) {
    return <Navigate to="/comunicados" replace />
  }

  const now = new Date()
  const mesAtual = now.getMonth() + 1
  const anoAtual = now.getFullYear()
  const mesLabel = now.toLocaleDateString('pt-PT', { month: 'long', year: 'numeric' })

  // ── KPIs ────────────────────────────────────────────────────
  const totalMoradores = moradores.length
  const quotasAtraso = quotas.filter(q => q.estado === 'em_atraso').length
  const ocorrenciasAbertas = ocorrencias.filter(o => ['aberta', 'aceite', 'em_analise'].includes(o.estado)).length

  const stats = [
    {
      label: 'Total Moradores', value: String(totalMoradores),
      delta: totalMoradores === 0 ? 'Sem moradores registados' : `${totalMoradores} moradores activos`,
      deltaUp: true, icon: Users, iconColor: 'text-blue-600', iconBg: 'bg-blue-50', href: '/moradores',
    },
    {
      label: 'Quotas em Atraso', value: String(quotasAtraso),
      delta: quotasAtraso === 0 ? 'Sem quotas em atraso' : `${quotasAtraso} por regularizar`,
      deltaUp: quotasAtraso === 0, icon: CreditCard, iconColor: 'text-red-500', iconBg: 'bg-red-50', href: '/quotas',
    },
    {
      label: 'Ocorrências Abertas', value: String(ocorrenciasAbertas),
      delta: ocorrenciasAbertas === 0 ? 'Sem ocorrências abertas' : `${ocorrenciasAbertas} em curso`,
      deltaUp: ocorrenciasAbertas === 0, icon: AlertTriangle, iconColor: 'text-yellow-600', iconBg: 'bg-yellow-50', href: '/ocorrencias',
    },
  ]

  // ── Financeiro ──────────────────────────────────────────────
  const totalReceitas = rubricas.filter(r => r.tipo === 'receita').reduce((s, r) => s + (r.valor_real ?? 0), 0)
  const totalDespesas = rubricas.filter(r => r.tipo === 'despesa').reduce((s, r) => s + (r.valor_real ?? 0), 0)
  const saldo = totalReceitas - totalDespesas

  // ── Atividade recente ────────────────────────────────────────
  const activityItems: { id: string; text: string; sub: string; time: string; type: ActivityType }[] = [
    ...ocorrencias.map(o => ({
      id: o.id, text: o.titulo,
      sub: `Ocorrência — ${o.tipo}`,
      time: new Date(o.created_at).toLocaleDateString('pt-PT'),
      type: 'ocorrencia' as ActivityType,
    })),
    ...comunicados.map(c => ({
      id: c.id, text: c.titulo,
      sub: 'Comunicado',
      time: new Date(c.created_at).toLocaleDateString('pt-PT'),
      type: 'comunicado' as ActivityType,
    })),
    ...manutencoes.filter(m => m.estado === 'concluida').map(m => ({
      id: m.id, text: m.titulo,
      sub: `Manutenção concluída${m.custo ? ` — ${formatCurrency(m.custo)}` : ''}`,
      time: new Date(m.data_conclusao ?? m.created_at).toLocaleDateString('pt-PT'),
      type: 'manutencao' as ActivityType,
    })),
  ]
    .sort((a, b) => new Date(b.time.split('/').reverse().join('-')).getTime() - new Date(a.time.split('/').reverse().join('-')).getTime())
    .slice(0, 6)

  // ── Próximos eventos ─────────────────────────────────────────
  const upcomingItems = manutencoes
    .filter(m => m.estado === 'agendada' && m.data_agendada && new Date(m.data_agendada) >= now)
    .sort((a, b) => new Date(a.data_agendada!).getTime() - new Date(b.data_agendada!).getTime())
    .slice(0, 5)
    .map(m => ({
      id: m.id,
      label: m.titulo,
      date: formatDate(m.data_agendada!),
      tagVariant: 'warning' as const,
      tag: 'Manutenção',
    }))

  // ── Ocupação ─────────────────────────────────────────────────
  const fracOcupadas = fracoes.filter(f => f.proprietario_id).length
  const fracTotal = fracoes.length
  const quotasMes = quotas.filter(q => {
    const d = new Date(q.data_vencimento)
    return d.getMonth() + 1 === mesAtual && d.getFullYear() === anoAtual
  })
  const quotasPagas = quotasMes.filter(q => q.estado === 'pago').length
  const quotasMesTotal = quotasMes.length

  // ── Documentos a expirar ─────────────────────────────────────
  const expiring = documentos
    .filter(d => d.data_validade)
    .map(d => ({ ...d, daysLeft: Math.ceil((new Date(d.data_validade!).getTime() - Date.now()) / 86400000) }))
    .filter(d => d.daysLeft <= 60)
    .sort((a, b) => a.daysLeft - b.daysLeft)

  // ── Ocorrências urgentes ──────────────────────────────────────
  const urgentes = ocorrencias.filter(o =>
    (o.prioridade === 'urgente' || o.tipo === 'risco') && (o.estado === 'aberta' || o.estado === 'aceite' || o.estado === 'em_analise')
  )

  if (isInquilino) {
    const comunicadosRecentes = comunicados
      .slice()
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 6)

    const intervencoesAgendadas = manutencoes
      .filter(m => m.estado === 'agendada' && m.data_agendada && new Date(m.data_agendada) >= now)
      .sort((a, b) => new Date(a.data_agendada!).getTime() - new Date(b.data_agendada!).getTime())
      .slice(0, 6)

    return (
      <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Painel do Inquilino</h1>
            <p className="text-slate-400 mt-1 text-sm capitalize">{today}</p>
          </div>
          <Button size="sm" onClick={() => navigate('/comunicados')}>
            Ver comunicados
          </Button>
        </div>

        <Card>
          <div className="px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 text-sm">Alertas de intervenções no prédio</h2>
          </div>
          {intervencoesAgendadas.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">Sem intervenções agendadas no momento.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {intervencoesAgendadas.map(i => (
                <li key={i.id} className="px-6 py-3.5 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-700">{i.titulo}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {i.data_agendada ? formatDate(i.data_agendada) : 'Data por confirmar'}
                    </p>
                  </div>
                  <Badge variant="warning">Intervenção</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-2">
            <h2 className="font-semibold text-slate-800 text-sm">Comunicados recentes</h2>
            <button onClick={() => navigate('/comunicados')} className="text-xs text-blue-600 hover:underline font-medium">Ver todos</button>
          </div>
          {comunicadosRecentes.length === 0 ? (
            <div className="px-6 py-8 text-center text-slate-400 text-sm">Sem comunicados publicados.</div>
          ) : (
            <ul className="divide-y divide-slate-50">
              {comunicadosRecentes.map(c => (
                <li key={c.id} className="px-6 py-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">{c.titulo}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{formatDate(c.created_at)}</p>
                    </div>
                    {c.importante && <Badge variant="danger">Importante</Badge>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    )
  }

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

      {/* ── Alertas Críticos ── */}
      {isAdmin && (expiring.length > 0 || urgentes.length > 0) && (
        <div className="space-y-3">
          {expiring.length > 0 && (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <ShieldAlert size={18} className="text-red-600" />
                <h3 className="font-bold text-red-700 text-sm">Documentos a expirar — Ação imediata necessária</h3>
              </div>
              <div className="space-y-2">
                {expiring.map(d => (
                  <div key={d.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-red-100">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className={d.daysLeft <= 0 ? 'text-red-600' : d.daysLeft <= 15 ? 'text-red-500' : 'text-orange-500'} />
                      <span className="text-sm font-medium text-slate-800">{d.nome}</span>
                      <span className="text-xs text-slate-400 capitalize">{d.categoria}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${d.daysLeft <= 0 ? 'bg-red-100 text-red-700' : d.daysLeft <= 15 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                        {d.daysLeft <= 0 ? 'EXPIRADO' : `${d.daysLeft} dias`}
                      </span>
                      <button onClick={() => navigate('/documentos')} className="text-xs text-red-600 hover:underline font-medium">Ver →</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {urgentes.length > 0 && (
            <div className="rounded-xl border-2 border-orange-300 bg-orange-50 p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={18} className="text-orange-600" />
                <h3 className="font-bold text-orange-700 text-sm">Ocorrências urgentes / situações de risco em aberto</h3>
              </div>
              <div className="space-y-2">
                {urgentes.map(o => (
                  <div key={o.id} className="flex items-center justify-between bg-white rounded-lg px-4 py-2.5 border border-orange-100">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className="text-orange-500" />
                      <span className="text-sm font-medium text-slate-800">{o.titulo}</span>
                      {o.autor_nome && <span className="text-xs text-slate-400">por {o.autor_nome}</span>}
                    </div>
                    <button onClick={() => navigate('/ocorrencias')} className="text-xs text-orange-600 hover:underline font-medium">Ver →</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  <p className={`text-xs mt-1 font-medium ${s.deltaUp ? 'text-green-600' : 'text-red-500'}`}>{s.delta}</p>
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
            {activityItems.length === 0 ? (
              <div className="px-6 py-8 text-center text-slate-400 text-sm">Sem atividade registada.</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {activityItems.map(item => {
                  const cfg = activityConfig[item.type]
                  return (
                    <li key={item.id} className="flex items-start gap-4 px-6 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className={`mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${cfg.bg} ${cfg.color}`}>{cfg.icon}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">{item.text}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{item.sub}</p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0 pt-0.5">{item.time}</span>
                    </li>
                  )
                })}
              </ul>
            )}
          </Card>

          {/* Financial summary */}
          <Card>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm capitalize">Resumo Financeiro — {mesLabel}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/contabilidade')}>
                Ver detalhes <ArrowRight size={14} />
              </Button>
            </div>
            <CardBody className="grid grid-cols-3 gap-4">
              {[
                { label: 'Receitas', value: totalReceitas, icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
                { label: 'Despesas', value: totalDespesas, icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-50' },
                { label: 'Saldo', value: saldo, icon: CreditCard, color: saldo >= 0 ? 'text-blue-600' : 'text-orange-600', bg: saldo >= 0 ? 'bg-blue-50' : 'bg-orange-50' },
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
                <button key={ql.label} onClick={() => navigate(ql.href)} className={`flex flex-col items-center gap-2 p-3 rounded-xl text-xs font-medium transition-colors ${ql.color}`}>
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
            {upcomingItems.length === 0 ? (
              <div className="px-5 py-6 text-center text-slate-400 text-sm">Sem manutenções agendadas.</div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {upcomingItems.map(u => (
                  <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                    <div className="w-12 shrink-0 text-center">
                      <p className="text-sm font-bold text-blue-600 leading-none">{u.date.split('/')[0]}</p>
                      <p className="text-xs text-slate-400 leading-none mt-0.5">/{u.date.split('/')[1]}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-slate-700 truncate">{u.label}</p>
                      <Badge variant={u.tagVariant} className="mt-1">{u.tag}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Occupancy bars */}
          <Card>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-800 text-sm">Ocupação do Edifício</h2>
            </div>
            <CardBody className="space-y-4">
              {[
                { label: 'Frações ocupadas', value: fracOcupadas, total: fracTotal || 1, showTotal: fracTotal, color: 'bg-blue-500' },
                { label: `Quotas pagas (${now.toLocaleDateString('pt-PT', { month: 'short' })})`, value: quotasPagas, total: quotasMesTotal || 1, showTotal: quotasMesTotal, color: 'bg-green-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-700">{item.value}/{item.showTotal}</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${item.color}`} style={{ width: `${Math.round((item.value / item.total) * 100)}%` }} />
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
