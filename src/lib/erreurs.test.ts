import { describe, expect, it } from 'vitest'
import { codeErreur, messageErreur, texteErreur } from './erreurs'

describe('messageErreur', () => {
  it('lit le message d’une Error', () => {
    expect(messageErreur(new Error('Accès refusé'), 'défaut')).toBe('Accès refusé')
  })

  it('lit le message d’une erreur Supabase, qui n’est pas une Error', () => {
    const erreur = { message: 'Indice non diffusé à cette équipe', code: 'P0001', details: null }
    expect(messageErreur(erreur, 'défaut')).toBe('Indice non diffusé à cette équipe')
  })

  it('accepte une chaîne', () => {
    expect(messageErreur('Failed to fetch', 'défaut')).toBe('Failed to fetch')
  })

  it('retombe sur le message par défaut quand l’erreur est muette', () => {
    expect(messageErreur(null, 'Action impossible.')).toBe('Action impossible.')
    expect(messageErreur({}, 'Action impossible.')).toBe('Action impossible.')
    expect(messageErreur(new Error('   '), 'Action impossible.')).toBe('Action impossible.')
  })
})

describe('texteErreur et codeErreur', () => {
  it('décrit une erreur sans message', () => {
    expect(texteErreur(42)).toBe('42')
  })

  it('lit le code PostgREST quand il existe', () => {
    expect(codeErreur({ message: 'x', code: 'PGRST202' })).toBe('PGRST202')
    expect(codeErreur(new Error('x'))).toBeNull()
  })
})
