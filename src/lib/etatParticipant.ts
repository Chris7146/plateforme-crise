import { tempsRestantMs } from './horloge'
import type { VueEquipe } from './participant'

/**
 * États de l'écran participant et minuteur dérivé (lot 3).
 *
 * Tout est déduit de `get_team_view()` et de l'échéance serveur : le client ne
 * décide jamais d'un passage d'étape, il se contente d'afficher le temps
 * restant calculé à partir de `step_deadline` et du décalage d'horloge mesuré.
 */

export type EtatParticipant =
  | 'attente' // la session n'a pas encore démarré
  | 'en_cours' // étape en cours, temps restant
  | 'temps_ecoule' // fin du temps, on attend l'animateur
  | 'pause' // pause générale décidée par l'animateur
  | 'fin' // exercice terminé
  | 'arret' // arrêt général

/** Priorité : un arrêt ou une fin priment sur une pause, elle-même sur l'étape. */
export function etatParticipant(vue: VueEquipe): EtatParticipant {
  if (vue.session.status === 'stopped') return 'arret'
  if (vue.session.status === 'finished' || vue.team.status === 'finished') return 'fin'
  if (vue.session.status === 'paused') return 'pause'
  if (vue.team.status === 'time_up') return 'temps_ecoule'
  if (vue.team.status === 'running') return 'en_cours'
  return 'attente'
}

const libelles: Record<EtatParticipant, string> = {
  attente: 'en attente du démarrage',
  en_cours: 'étape en cours',
  temps_ecoule: 'temps écoulé · en attente de l’animateur',
  pause: 'exercice en pause',
  fin: 'exercice terminé',
  arret: 'exercice interrompu',
}

export function libelleEtat(etat: EtatParticipant): string {
  return libelles[etat]
}

/**
 * Temps restant à afficher, en millisecondes, ou `null` si aucun minuteur.
 * En pause, le serveur a figé le reste dans `remaining_on_pause_seconds`.
 */
export function tempsRestantAffiche(
  vue: VueEquipe,
  decalageMs: number,
  clientMs: number = Date.now(),
): number | null {
  const etat = etatParticipant(vue)
  if (etat === 'pause') {
    return vue.team.remaining_on_pause_seconds === null
      ? null
      : vue.team.remaining_on_pause_seconds * 1000
  }
  if (etat !== 'en_cours' && etat !== 'temps_ecoule') return null
  if (!vue.team.step_deadline) return null
  return tempsRestantMs(new Date(vue.team.step_deadline).getTime(), decalageMs, clientMs)
}

export type EtatEtape = 'terminee' | 'courante' | 'a_venir'

/**
 * État de chaque segment de la barre de progression.
 * Les étapes à venir restent muettes : leur contenu n'est jamais transmis.
 */
export function progressionEtapes(indexCourant: number, nombre: number): EtatEtape[] {
  return Array.from({ length: Math.max(0, nombre) }, (_, i) => {
    if (i < indexCourant) return 'terminee'
    if (i === indexCourant) return 'courante'
    return 'a_venir'
  })
}

/** « étape 3 / 6 · Propagation » (voir maquette `participant.html`). */
export function libelleEtape(vue: VueEquipe): string {
  const numero = vue.team.current_step + 1
  const total = vue.team.step_count
  const titre = vue.step?.title
  const base = `étape ${numero} / ${total}`
  return titre ? `${base} · ${titre}` : base
}

/** Les questions ne sont modifiables que pendant l'étape, avant validation. */
export function saisiePossible(vue: VueEquipe): boolean {
  return etatParticipant(vue) === 'en_cours' && vue.submitted !== true
}

/** La validation reste possible après l'échéance, tant que l'animateur n'a pas fait passer l'étape. */
export function validationPossible(vue: VueEquipe): boolean {
  const etat = etatParticipant(vue)
  return (etat === 'en_cours' || etat === 'temps_ecoule') && vue.submitted !== true
}
