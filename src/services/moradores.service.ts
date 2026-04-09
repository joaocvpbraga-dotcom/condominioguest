import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

export const moradoresService = {
  async list(condominioId: string) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, fracoes(label)')
      .eq('condominio_id', condominioId)
      .order('nome')
    if (error) throw error
    return data as Profile[]
  },

  async create(morador: Omit<Profile, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('profiles')
      .insert(morador)
      .select()
      .single()
    if (error) throw error
    return data as Profile
  },

  async update(id: string, updates: Partial<Profile>) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Profile
  },
}
