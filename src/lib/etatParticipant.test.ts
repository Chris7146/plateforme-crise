import { describe, expect, it } from 'vitest'
import {
  etatParticipant,
  libelleEtape,
  libelleEtat,
  progressionEtapes,
  saisiePossible,
  tempsRestantAffiche,
  validationPossible,
} from './etatParticipant'
import type { VueEquipe } from './participant'

function vue(
  equipe: Partial<VueEquipe['team']> = {},
  sessionStatut = 'running',
  reste: Partial<VueEquipe> = {},
): VueEquipe {
  return {
    server_now: '2026-10-12T09:00:00Z',
    session: { id: 'se-1', title: 'Exercice', status: sessionStatut },
    team: {
      id: 'eq-1',
      name: 'Équipe 3',
      status: 'running',
      current_step: 2,
      step_count: 6,
      step_started_at: '2026-10-12T09:00:00Z',
      step_deadline: '2026-10-12T09:08:00Z',
      remaining_on_pause_seconds: null,
      state_version: 4,
      ...equipe,
    },
    participants: [],
    messages: [],
    step: null,
    ...reste,
  }
}

describe('etatParticipant', () => {
  it('reconnaît les six états', () => {
    expect(etatParticipant(vue({ status: 'waiting' }, 'draft'))).toBe('attente')
    expect(etatParticipant(vue())).toBe('en_cours')
    expect(etatParticipant(vue({ status: 'time_up' }))).toBe('temps_ecoule')
    expect(etatParticipant(vue({}, 'paused'))).toBe('pause')
    expect(etatParticipant(vue({ status: 'finished' }))).toBe('fin')
    expect(etatParticipant(vue({}, 'stopped'))).toBe('arret')
  })

  it('fait primer l’arrêt général sur tout le reste', () => {
    expect(etatParticipant(vue({ status: 'running' }, 'stopped'))).toBe('arret')
    expect(etatParticipant(vue({ status: 'time_up' }, 'stopped'))).toBe('arret')
  })

  it('fait primer la pause sur l’étape en cours', () => {
    expect(etatParticipant(vue({ status: 'running' }, 'paused'))).toBe('pause')
  })

  it('nomme chaque état en français', () => {
    expect(libelleEtat('temps_ecoule')).toBe('temps écoulé · en attente de l’animateur')
    expect(libelleEtat('pause')).toBe('exercice en pause')
  })
})

describe('tempsRestantAffiche', () => {
  const debut = new Date('2026-10-12T09:00:00Z').getTime()

  it('calcule le reste à partir de l’échéance serveur et du décalage', () => {
    // Échéance à 09:08, client à 09:03 : 5 minutes restantes.
    expect(tempsRestantAffiche(vue(), 0, debut + 3 * 60_000)).toBe(5 * 60_000)
  })

  it('tient compte d’un client en avance ou en retard', () => {
    // Client en retard de 30 s sur le serveur : le décalage le compense.
    expect(tempsRestantAffiche(vue(), 30_000, debut + 3 * 60_000)).toBe(5 * 60_000 - 30_000)
  })

  it('peut être négatif quand l’échéance est dépassée', () => {
    expect(tempsRestantAffiche(vue({ status: 'time_up' }), 0, debut + 9 * 60_000)).toBe(-60_000)
  })

  it('utilise le reste figé par le serveur pendant une pause', () => {
    const enPause = vue({ remaining_on_pause_seconds: 137 }, 'paused')
    expect(tempsRestantAffiche(enPause, 0, debut + 3 * 60_000)).toBe(137_000)
  })

  it('n’affiche aucun minuteur en attente, à la fin ou sans échéance', () => {
    expect(tempsRestantAffiche(vue({ status: 'waiting' }, 'draft'), 0, debut)).toBeNull()
    expect(tempsRestantAffiche(vue({ status: 'finished' }), 0, debut)).toBeNull()
    expect(tempsRestantAffiche(vue({ step_deadline: null }), 0, debut)).toBeNull()
  })
})

describe('progressionEtapes', () => {
  it('marque les étapes franchies, courante et à venir', () => {
    expect(progressionEtapes(2, 6)).toEqual([
      'terminee',
      'terminee',
      'courante',
      'a_venir',
      'a_venir',
      'a_venir',
    ])
  })

  it('gère la première et la dernière étape', () => {
    expect(progressionEtapes(0, 2)).toEqual(['courante', 'a_venir'])
    expect(progressionEtapes(1, 2)).toEqual(['terminee', 'courante'])
  })

  it('renvoie une liste vide sans étape connue', () => {
    expect(progressionEtapes(0, 0)).toEqual([])
  })
})

describe('libelleEtape', () => {
  it('numérote à partir de 1 et ajoute le titre quand il est connu', () => {
    expect(libelleEtape(vue())).toBe('étape 3 / 6')
    const avecTitre = vue()
    avecTitre.step = {
      index: 2,
      title: 'Propagation',
      duration_seconds: 480,
      ambient_audio_path: null,
      contents: [],
      hints: [],
      questions: [],
    }
    expect(libelleEtape(avecTitre)).toBe('étape 3 / 6 · Propagation')
  })
})

describe('saisiePossible et validationPossible', () => {
  it('autorise la saisie pendant l’étape seulement', () => {
    expect(saisiePossible(vue())).toBe(true)
    expect(saisiePossible(vue({ status: 'time_up' }))).toBe(false)
    expect(saisiePossible(vue({}, 'paused'))).toBe(false)
  })

  it('laisse valider après l’échéance, tant que l’animateur n’a pas fait passer l’étape', () => {
    expect(validationPossible(vue({ status: 'time_up' }))).toBe(true)
    expect(validationPossible(vue({}, 'paused'))).toBe(false)
  })

  it('interdit tout après validation de la réponse d’équipe', () => {
    const transmis = vue({}, 'running', { submitted: true })
    expect(saisiePossible(transmis)).toBe(false)
    expect(validationPossible(transmis)).toBe(false)
  })
})
