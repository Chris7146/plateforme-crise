import type { Indice } from './participant'

/**
 * Panneau « Indices » : logique d'état, sans React ni accès réseau.
 *
 * Règle centrale : le signal d'arrivée (son, halo) ne se déclenche QUE pour un
 * indice qui apparaît en cours de session. Ni le premier chargement, ni une
 * reconnexion, ni une relecture périodique ne doivent sonner — or tous trois
 * repassent par la même relecture complète de `get_team_view()`. On compare
 * donc les identifiants reçus à ceux déjà connus de cet appareil, la première
 * lecture servant uniquement à amorcer cette liste.
 *
 * Un indice automatique (T+) et un indice manuel suivent exactement le même
 * chemin : la vue d'équipe ne les distingue pas, cette logique non plus.
 */

export interface SuiviIndices {
  /** Identifiants déjà vus sur cet appareil, toutes étapes confondues. */
  connus: string[]
  /** Identifiants apparus à la dernière relecture (vide au premier chargement). */
  arrivees: string[]
  /** Faut-il signaler une arrivée (son + halo) ? */
  annonce: boolean
}

/**
 * Compare la vue reçue à l'état précédent.
 * `precedent` à `null` = première lecture : on amorce sans rien annoncer.
 */
export function suivreIndices(precedent: SuiviIndices | null, indices: Indice[]): SuiviIndices {
  const recus = indices.map((indice) => indice.id)
  if (precedent === null) return { connus: recus, arrivees: [], annonce: false }

  const dejaVus = new Set(precedent.connus)
  const arrivees = recus.filter((id) => !dejaVus.has(id))
  return {
    // Les indices d'une étape passée disparaissent de la vue : on garde leurs
    // identifiants pour qu'un retour en arrière ne les annonce pas à nouveau.
    connus: [...precedent.connus, ...arrivees],
    arrivees,
    annonce: arrivees.length > 0,
  }
}

/** Le plus récent en premier (voir maquette) ; à défaut d'heure, l'ordre reçu. */
export function indicesTries(indices: Indice[]): Indice[] {
  return [...indices].sort((a, b) => {
    const ta = a.released_at ? Date.parse(a.released_at) : 0
    const tb = b.released_at ? Date.parse(b.released_at) : 0
    return tb - ta
  })
}

/** « 2 indices » / « 1 indice » : compteur du titre du panneau. */
export function libelleCompteur(nombre: number): string {
  return nombre <= 1 ? `${nombre} indice` : `${nombre} indices`
}

/**
 * Un indice est ouvert si la vue d'équipe le dit, ou s'il vient d'être ouvert
 * sur cet appareil : `open_hint()` renvoie le texte immédiatement, sans
 * attendre la relecture complète qui suit.
 */
export function estOuvert(indice: Indice, ouvertsLocalement?: ReadonlySet<string>): boolean {
  return indice.opened || (ouvertsLocalement?.has(indice.id) ?? false)
}

/** Nombre d'indices reçus mais pas encore ouverts : pastille de notification. */
export function nombreNonOuverts(indices: Indice[], ouvertsLocalement?: ReadonlySet<string>): number {
  return indices.filter((indice) => !estOuvert(indice, ouvertsLocalement)).length
}

/** Heure de réception affichée à côté de l'indice (« 14:32 »). */
export function heureReception(indice: Indice): string {
  if (!indice.released_at) return ''
  return new Date(indice.released_at).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}
