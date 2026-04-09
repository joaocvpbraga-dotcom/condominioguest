import { supabase } from '@/lib/supabase'
import type { Quota } from '@/types'

export const quotasService = {
  async list(condominioId: string) {
    const { data, error } = await supabase
      .from('quotas')
      .select('*, fracao:fracoes(numero, andar, proprietario:profiles(nome))')
      .eq('condominio_id', condominioId)
      .order('data_vencimento', { ascending: false })
    if (error) throw error
    return data as Quota[]
  },

  async create(quota: Omit<Quota, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('quotas')
      .insert(quota)
      .select()
      .single()
    if (error) throw error
    return data as Quota
  },

  async createBatch(quotas: Omit<Quota, 'id' | 'created_at'>[]) {
    const { data, error } = await supabase
      .from('quotas')
      .insert(quotas)
      .select()
    if (error) throw error
    return data as Quota[]
  },

  async marcarPago(id: string, dataPagamento: string) {
    const { data, error } = await supabase
      .from('quotas')
      .update({ estado: 'pago', data_pagamento: dataPagamento })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Quota
  },

  async atualizarEstado(id: string, estado: Quota['estado']) {
    const { data, error } = await supabase
      .from('quotas')
      .update({ estado })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Quota
  },
}
