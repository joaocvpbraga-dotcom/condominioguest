import { supabase } from '@/lib/supabase'
import type { Ocorrencia } from '@/types'

export const ocorrenciasService = {
  async list(condominioId: string) {
    const { data, error } = await supabase
      .from('ocorrencias')
      .select('*, autor:profiles(nome, email)')
      .eq('condominio_id', condominioId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Ocorrencia[]
  },

  async create(ocorrencia: Omit<Ocorrencia, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('ocorrencias')
      .insert(ocorrencia)
      .select()
      .single()
    if (error) throw error
    return data as Ocorrencia
  },

  async atualizarEstado(id: string, estado: Ocorrencia['estado']) {
    const { data, error } = await supabase
      .from('ocorrencias')
      .update({ estado })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Ocorrencia
  },
}
