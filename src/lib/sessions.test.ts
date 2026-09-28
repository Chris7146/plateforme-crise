import { describe, expect, it } from 'vitest'
import {
  codeComplet,
  estModifiable,
  libelleStatutSession,
  nomsEquipesParDefaut,
  normaliserCode,
  origineJoignableParLesParticipants,
  raisonDemarrageImpossible,
  tonStatutSession,
  urlRejoindre,
  type Equipe,
  type Session,
} from './sessions'

function session(statut: Session['status']): Session {
  return {
    id: 'se-1',
    exercise_id: 'ex-1',
    title: 'Exercice du 12 octobre',
    status: statut,
    snapshot: null,
    started_at: null,
    paused_at: null,
    ended_at: null,
    created_by: null,
    created_at: '2026-10-01T09:00:00Z',
  }
}

const equipe = { id: 'eq-1' } as Equipe

describe('libelleStatutSession', () => {
  it('nomme les cinq statuts en français', () => {
    expect(libelleStatutSession('draft')).toBe('brouillon')
    expect(libelleStatutSession('running')).toBe('en cours')
    expect(libelleStatutSession('paused')).toBe('en pause')
    expect(libelleStatutSession('finished')).toBe('terminée')
    expect(libelleStatutSession('stopped')).toBe('arrêtée')
  })

  it('signale par la couleur les états qui demandent attention', () => {
    expect(tonStatutSession('paused')).toBe('attention')
    expect(tonStatutSession('stopped')).toBe('attention')
    expect(tonStatutSession('draft')).toBe('neutre')
  })
})

describe('estModifiable', () => {
  it('n’autorise les changements d’équipes qu’avant le démarrage', () => {
    expect(estModifiable('draft')).toBe(true)
    expect(estModifiable('running')).toBe(false)
    expect(estModifiable('finished')).toBe(false)
  })
})

describe('normaliserCode', () => {
  it('met en majuscules et retire séparateurs et espaces', () => {
    expect(normaliserCode('7kq-2mv')).toBe('7KQ2MV')
    expect(normaliserCode(' 7kq 2mv ')).toBe('7KQ2MV')
  })

  it('borne à six caractères', () => {
    expect(normaliserCode('7KQ2MVXYZ')).toBe('7KQ2MV')
  })

  it('reconnaît un code complet', () => {
    expect(codeComplet('7kq2mv')).toBe(true)
    expect(codeComplet('7KQ2M')).toBe(false)
    expect(codeComplet('')).toBe(false)
  })
})

describe('urlRejoindre', () => {
  it('compose l’adresse du QR code', () => {
    expect(urlRejoindre('7kq2mv', 'https://crise.exemple.fr')).toBe(
      'https://crise.exemple.fr/?code=7KQ2MV',
    )
  })

  it('tolère une origine terminée par une barre oblique', () => {
    expect(urlRejoindre('7KQ2MV', 'http://localhost:5173/')).toBe(
      'http://localhost:5173/?code=7KQ2MV',
    )
  })
})

describe('nomsEquipesParDefaut', () => {
  it('numérote à la suite des équipes existantes', () => {
    expect(nomsEquipesParDefaut(3)).toEqual(['Équipe 1', 'Équipe 2', 'Équipe 3'])
    expect(nomsEquipesParDefaut(2, 3)).toEqual(['Équipe 4', 'Équipe 5'])
  })

  it('renvoie une liste vide pour un nombre nul ou négatif', () => {
    expect(nomsEquipesParDefaut(0)).toEqual([])
    expect(nomsEquipesParDefaut(-2)).toEqual([])
  })
})

describe('raisonDemarrageImpossible', () => {
  it('accepte une session en brouillon avec équipes et étapes', () => {
    expect(raisonDemarrageImpossible(session('draft'), [equipe], 6)).toBeNull()
  })

  it('refuse une session déjà démarrée', () => {
    expect(raisonDemarrageImpossible(session('running'), [equipe], 6)).toBe(
      'La session a déjà été démarrée.',
    )
  })

  it('refuse une session sans équipe', () => {
    expect(raisonDemarrageImpossible(session('draft'), [], 6)).toBe(
      'Ajoutez au moins une équipe avant de démarrer.',
    )
  })

  it('refuse un exercice sans étape', () => {
    expect(raisonDemarrageImpossible(session('draft'), [equipe], 0)).toBe(
      'L’exercice ne comporte aucune étape.',
    )
  })
})

describe('origineJoignableParLesParticipants', () => {
  it('refuse les adresses locales, inutilisables depuis une tablette', () => {
    expect(origineJoignableParLesParticipants('http://localhost:5173')).toBe(false)
    expect(origineJoignableParLesParticipants('http://127.0.0.1:5173')).toBe(false)
    expect(origineJoignableParLesParticipants('http://[::1]:5173')).toBe(false)
  })

  it('accepte une adresse réseau ou un nom de domaine', () => {
    expect(origineJoignableParLesParticipants('http://10.2.0.115:5173')).toBe(true)
    expect(origineJoignableParLesParticipants('http://192.168.1.20:5173')).toBe(true)
    expect(origineJoignableParLesParticipants('https://crise.exemple.fr')).toBe(true)
  })

  it('ne se laisse pas tromper par un nom de domaine contenant « localhost »', () => {
    expect(origineJoignableParLesParticipants('https://localhost.exemple.fr')).toBe(true)
  })
})
