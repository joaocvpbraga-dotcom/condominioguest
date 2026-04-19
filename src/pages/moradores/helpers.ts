import type { PermissoesMorador } from '@/types'

export function getNovoUtilizadorErrorMessage(error: unknown): string {
  const raw = (error instanceof Error ? error.message : String(error)).toLowerCase()
  if (
    raw.includes('already been registered') ||
    raw.includes('already registered') ||
    raw.includes('user already registered') ||
    raw.includes('email_exists')
  ) {
    return 'Este email ja esta registado. Use outro email ou recupere a palavra-passe.'
  }

  return error instanceof Error ? error.message : String(error)
}

export function buildPermissoesDefault(moradorId: string): PermissoesMorador {
  return {
    morador_id: moradorId,
    piscina: false,
    ginasio: false,
    estacionamento: false,
    sala_condominio: false,
    lavandaria: false,
    terracos: false,
  }
}
