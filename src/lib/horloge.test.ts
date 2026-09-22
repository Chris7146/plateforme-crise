import { describe, expect, it } from 'vitest'
import {
  calculerDecalage,
  formatMMSS,
  maintenantServeur,
  niveauMinuteur,
  tempsRestantMs,
} from './horloge'

describe('calculerDecalage', () => {
  it('est positif quand le serveur est en avance sur le client', () => {
    expect(calculerDecalage(10_000, 7_000)).toBe(3_000)
  })

  it('est négatif quand le client est en avance sur le serveur', () => {
    expect(calculerDecalage(7_000, 10_000)).toBe(-3_000)
  })

  it('est nul quand les horloges coïncident', () => {
    expect(calculerDecalage(5_000, 5_000)).toBe(0)
  })
})

describe('maintenantServeur', () => {
  it('ajoute le décalage à l’heure client', () => {
    expect(maintenantServeur(3_000, 1_000)).toBe(4_000)
    expect(maintenantServeur(-3_000, 10_000)).toBe(7_000)
  })
})

describe('tempsRestantMs', () => {
  it('tient compte du décalage d’horloge', () => {
    // Client à 1000, serveur en avance de 500 → heure serveur estimée 1500.
    // Échéance à 5000 → il reste 3500 ms.
    expect(tempsRestantMs(5_000, 500, 1_000)).toBe(3_500)
  })

  it('est négatif lorsque l’échéance est dépassée', () => {
    expect(tempsRestantMs(1_000, 0, 4_000)).toBe(-3_000)
  })

  it('vaut zéro pile à l’échéance', () => {
    expect(tempsRestantMs(4_000, 0, 4_000)).toBe(0)
  })
})

describe('formatMMSS', () => {
  it('formate en m:ss avec secondes sur deux chiffres', () => {
    expect(formatMMSS(125_000)).toBe('2:05')
    expect(formatMMSS(600_000)).toBe('10:00')
  })

  it('arrondit à la seconde supérieure', () => {
    expect(formatMMSS(1_200)).toBe('0:02')
  })

  it('borne à zéro quand le temps est écoulé', () => {
    expect(formatMMSS(-5_000)).toBe('0:00')
  })
})

describe('niveauMinuteur', () => {
  it('est nominal au-dessus de 2 min', () => {
    expect(niveauMinuteur(180_000)).toBe('nominal')
  })

  it('passe en attention sous 2 min', () => {
    expect(niveauMinuteur(119_000)).toBe('attention')
  })

  it('passe en urgence sous 1 min', () => {
    expect(niveauMinuteur(59_000)).toBe('urgence')
  })
})
