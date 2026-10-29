import { describe, expect, it } from 'vitest'
import {
  heureReception,
  indicesTries,
  libelleCompteur,
  messageOuvertureIndice,
  nombreNonOuverts,
  suivreIndices,
  type SuiviIndices,
} from './indices'
import type { Indice } from './participant'

function indice(partiel: Partial<Indice> & { id: string }): Indice {
  return {
    released_at: '2026-10-02T14:32:00Z',
    opened: false,
    body: null,
    ...partiel,
  }
}

describe('suivi des indices', () => {
  it('n’annonce rien au premier chargement, même avec des indices déjà reçus', () => {
    // Rechargement de page en cours d'exercice : les indices sont restaurés,
    // aucun son ne doit être rejoué.
    const suivi = suivreIndices(null, [indice({ id: 'h-1' }), indice({ id: 'h-2' })])
    expect(suivi.annonce).toBe(false)
    expect(suivi.arrivees).toEqual([])
    expect(suivi.connus).toEqual(['h-1', 'h-2'])
  })

  it('annonce un indice qui arrive en cours de session', () => {
    const depart = suivreIndices(null, [indice({ id: 'h-1' })])
    const suite = suivreIndices(depart, [indice({ id: 'h-1' }), indice({ id: 'h-2' })])
    expect(suite.annonce).toBe(true)
    expect(suite.arrivees).toEqual(['h-2'])
  })

  it('n’annonce rien à une relecture identique (reconnexion, relecture périodique)', () => {
    // Coupure Wi-Fi puis reprise : get_team_view renvoie les mêmes indices.
    const liste = [indice({ id: 'h-1' }), indice({ id: 'h-2' })]
    let suivi: SuiviIndices | null = suivreIndices(null, liste)
    suivi = suivreIndices(suivi, liste)
    expect(suivi.annonce).toBe(false)
    suivi = suivreIndices(suivi, liste)
    expect(suivi.annonce).toBe(false)
  })

  it('n’annonce pas deux fois le même indice après une rafale de relectures', () => {
    const depart = suivreIndices(null, [])
    const arrivee = suivreIndices(depart, [indice({ id: 'h-1' })])
    expect(arrivee.annonce).toBe(true)
    const relecture = suivreIndices(arrivee, [indice({ id: 'h-1' })])
    expect(relecture.annonce).toBe(false)
  })

  it('traite un indice automatique exactement comme un indice manuel', () => {
    // La vue d'équipe ne distingue pas les deux modes : même forme, même état.
    const auto = suivreIndices(suivreIndices(null, []), [indice({ id: 'auto-1' })])
    const manuel = suivreIndices(suivreIndices(null, []), [indice({ id: 'manuel-1' })])
    expect(auto.annonce).toBe(manuel.annonce)
    expect(auto.arrivees.length).toBe(manuel.arrivees.length)
  })

  it('ne réannonce pas un indice disparu de la vue puis revenu', () => {
    const depart = suivreIndices(null, [indice({ id: 'h-1' })])
    const etapeSuivante = suivreIndices(depart, [])
    const retour = suivreIndices(etapeSuivante, [indice({ id: 'h-1' })])
    expect(retour.annonce).toBe(false)
  })

  it('annonce plusieurs indices manqués en une seule fois', () => {
    // Reprise après coupure : pas de rafale de sons, une seule annonce.
    const depart = suivreIndices(null, [])
    const reprise = suivreIndices(depart, [
      indice({ id: 'h-1' }),
      indice({ id: 'h-2' }),
      indice({ id: 'h-3' }),
    ])
    expect(reprise.annonce).toBe(true)
    expect(reprise.arrivees).toEqual(['h-1', 'h-2', 'h-3'])
  })
})

describe('présentation des indices', () => {
  it('place le plus récent en premier', () => {
    const tries = indicesTries([
      indice({ id: 'ancien', released_at: '2026-10-02T14:00:00Z' }),
      indice({ id: 'recent', released_at: '2026-10-02T14:30:00Z' }),
    ])
    expect(tries.map((i) => i.id)).toEqual(['recent', 'ancien'])
  })

  it('compte les indices non ouverts pour la pastille', () => {
    const liste = [
      indice({ id: 'h-1', opened: true, body: 'déjà lu' }),
      indice({ id: 'h-2' }),
      indice({ id: 'h-3' }),
    ]
    expect(nombreNonOuverts(liste)).toBe(2)
  })

  it('accorde le compteur du titre', () => {
    expect(libelleCompteur(0)).toBe('0 indice')
    expect(libelleCompteur(1)).toBe('1 indice')
    expect(libelleCompteur(3)).toBe('3 indices')
  })

  it('affiche l’heure de réception, et rien sans heure connue', () => {
    expect(heureReception(indice({ id: 'h-1', released_at: null }))).toBe('')
    expect(heureReception(indice({ id: 'h-1' }))).toMatch(/^\d{2}:\d{2}$/)
  })
})

describe('messageOuvertureIndice', () => {
  it('nomme la cause quand la base n’est pas à jour', () => {
    // Cas réel du test « Vladivostok » : migration du panneau non appliquée.
    expect(
      messageOuvertureIndice({
        code: 'PGRST202',
        message: 'Could not find the function public.open_hint in the schema cache',
      }),
    ).toMatch(/n’est pas encore installée sur la base/)
  })

  it('distingue une coupure réseau', () => {
    expect(messageOuvertureIndice(new TypeError('Failed to fetch'))).toMatch(/Connexion interrompue/)
  })

  it('explique un exercice ou une étape hors cours', () => {
    expect(messageOuvertureIndice(new Error('L’exercice n’est pas en cours'))).toMatch(
      /L’exercice n’est pas en cours/,
    )
    expect(messageOuvertureIndice(new Error('L’étape n’est pas en cours'))).toMatch(
      /Cette étape n’est plus en cours/,
    )
  })

  it('explique un indice non diffusé ou hors équipe', () => {
    expect(messageOuvertureIndice({ message: 'Indice non diffusé à cette équipe' })).toMatch(
      /pas encore été diffusé à votre équipe/,
    )
    expect(messageOuvertureIndice({ message: 'Accès refusé' })).toMatch(/ne concerne pas votre équipe/)
  })

  it('retombe sur le message générique pour une cause inconnue', () => {
    expect(messageOuvertureIndice(new Error('boom'))).toBe('Indice indisponible pour l’instant. Réessayez.')
    expect(messageOuvertureIndice(null)).toBe('Indice indisponible pour l’instant. Réessayez.')
  })
})
