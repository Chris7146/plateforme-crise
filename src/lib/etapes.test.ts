import { describe, expect, it } from 'vitest'
import {
  deplacer,
  estModifiee,
  libelleFinTemps,
  normaliserMinutes,
  secondesVersMinutes,
} from './etapes'

describe('deplacer', () => {
  const liste = ['a', 'b', 'c', 'd']

  it('déplace un élément vers le haut', () => {
    expect(deplacer(liste, 2, 0)).toEqual(['c', 'a', 'b', 'd'])
  })

  it('déplace un élément vers le bas', () => {
    expect(deplacer(liste, 0, 2)).toEqual(['b', 'c', 'a', 'd'])
  })

  it('ne mute pas le tableau d’origine', () => {
    deplacer(liste, 0, 3)
    expect(liste).toEqual(['a', 'b', 'c', 'd'])
  })

  it('ignore les positions hors bornes ou identiques', () => {
    expect(deplacer(liste, 1, 1)).toEqual(liste)
    expect(deplacer(liste, -1, 2)).toEqual(liste)
    expect(deplacer(liste, 0, 9)).toEqual(liste)
  })
})

describe('normaliserMinutes', () => {
  it('borne la saisie entre 1 et 60 minutes', () => {
    expect(normaliserMinutes('8')).toBe(8)
    expect(normaliserMinutes('0')).toBe(1)
    expect(normaliserMinutes('120')).toBe(60)
  })

  it('renvoie null pour une saisie illisible', () => {
    expect(normaliserMinutes('')).toBeNull()
    expect(normaliserMinutes('abc')).toBeNull()
  })
})

describe('secondesVersMinutes', () => {
  it('convertit et arrondit à la minute', () => {
    expect(secondesVersMinutes(480)).toBe(8)
    expect(secondesVersMinutes(90)).toBe(2)
  })
})

describe('libelleFinTemps', () => {
  it('nomme les deux réglages', () => {
    expect(libelleFinTemps('auto')).toBe('passage automatique')
    expect(libelleFinTemps('facilitator')).toBe('attendre l’animateur')
  })
})

describe('estModifiee', () => {
  it('ne marque « modifiée » qu’une étape issue d’un modèle et retouchée', () => {
    expect(estModifiee({ source_id: 'st-1', is_modified: true })).toBe(true)
    expect(estModifiee({ source_id: 'st-1', is_modified: false })).toBe(false)
    // Étape propre à un modèle : pas de filiation, donc rien à signaler.
    expect(estModifiee({ source_id: null, is_modified: true })).toBe(false)
  })
})
