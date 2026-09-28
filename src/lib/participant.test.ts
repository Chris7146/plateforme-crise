import { beforeEach, describe, expect, it } from 'vitest'
import {
  exerciceEnCours,
  lireEquipeMemorisee,
  memoriserEquipe,
  messageErreurEntree,
  oublierEquipe,
  validerPrenom,
  type VueEquipe,
} from './participant'

function vue(statutEquipe: string): VueEquipe {
  return {
    server_now: '2026-10-12T09:00:00Z',
    session: { id: 'se-1', title: 'Exercice', status: 'running' },
    team: {
      id: 'eq-1',
      name: 'Équipe 3',
      status: statutEquipe,
      current_step: 0,
      step_count: 6,
      step_started_at: null,
      step_deadline: null,
      remaining_on_pause_seconds: null,
      state_version: 1,
    },
    participants: [],
    messages: [],
    step: null,
  }
}

describe('validerPrenom', () => {
  it('accepte un prénom ordinaire', () => {
    expect(validerPrenom('Camille')).toBeNull()
    expect(validerPrenom('  Jean-Baptiste ')).toBeNull()
  })

  it('refuse un prénom vide ou trop long', () => {
    expect(validerPrenom('   ')).toBe('Indiquez votre prénom.')
    expect(validerPrenom('a'.repeat(61))).toBe('Prénom trop long (60 caractères maximum).')
  })
})

describe('messageErreurEntree', () => {
  it('rend le code inconnu compréhensible', () => {
    expect(messageErreurEntree(new Error("Code d'équipe inconnu"))).toBe(
      'Code inconnu. Vérifiez les six caractères affichés par l’animateur.',
    )
  })

  it('reprend les autres messages métier de la base', () => {
    expect(messageErreurEntree(new Error('Cet exercice est terminé'))).toBe(
      'Cet exercice est terminé.',
    )
    expect(messageErreurEntree(new Error('Panne réseau'))).toBe('Panne réseau')
  })
})

describe('exerciceEnCours', () => {
  it('distingue la salle d’attente de l’exercice lancé', () => {
    expect(exerciceEnCours(vue('waiting'))).toBe(false)
    expect(exerciceEnCours(vue('running'))).toBe(true)
    expect(exerciceEnCours(vue('time_up'))).toBe(true)
    expect(exerciceEnCours(vue('finished'))).toBe(false)
  })
})

describe('mémorisation de l’équipe', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('retrouve l’équipe après un rechargement', () => {
    memoriserEquipe({ equipeId: 'eq-1', prenom: 'Camille' })
    expect(lireEquipeMemorisee()).toEqual({ equipeId: 'eq-1', prenom: 'Camille' })
  })

  it('renvoie null sans mémoire', () => {
    expect(lireEquipeMemorisee()).toBeNull()
  })

  it('ignore une mémoire corrompue plutôt que de lever une erreur', () => {
    localStorage.setItem('crise.equipe', '{ ceci n’est pas du JSON')
    expect(lireEquipeMemorisee()).toBeNull()
    localStorage.setItem('crise.equipe', '{"equipeId":42}')
    expect(lireEquipeMemorisee()).toBeNull()
  })

  it('oublie l’équipe à la demande', () => {
    memoriserEquipe({ equipeId: 'eq-1', prenom: 'Camille' })
    oublierEquipe()
    expect(lireEquipeMemorisee()).toBeNull()
  })
})
