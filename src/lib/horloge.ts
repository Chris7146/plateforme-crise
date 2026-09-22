import { supabase } from './supabase'

/**
 * Utilitaire d'horloge.
 *
 * Principe (voir CLAUDE.md) : le serveur détient les ÉCHÉANCES (`step_deadline`),
 * jamais des décomptes. Le client mesure son décalage d'horloge par rapport au
 * serveur via la RPC `server_now()`, puis calcule lui-même le temps restant.
 * Un `setInterval` ne sert qu'à rafraîchir l'affichage.
 */

/** Décalage = temps serveur − temps client, au même instant (en millisecondes). */
export function calculerDecalage(serveurMs: number, clientMs: number): number {
  return serveurMs - clientMs
}

/** Estimation de l'heure serveur à partir de l'heure client et du décalage mesuré. */
export function maintenantServeur(decalageMs: number, clientMs: number = Date.now()): number {
  return clientMs + decalageMs
}

/**
 * Temps restant avant une échéance, du point de vue du serveur, en millisecondes.
 * Peut être négatif si l'échéance est dépassée.
 */
export function tempsRestantMs(
  deadlineMs: number,
  decalageMs: number,
  clientMs: number = Date.now(),
): number {
  return deadlineMs - maintenantServeur(decalageMs, clientMs)
}

/** Formatage m:ss pour l'affichage du minuteur (borné à 0). */
export function formatMMSS(restantMs: number): string {
  const totalSecondes = Math.max(0, Math.ceil(restantMs / 1000))
  const minutes = Math.floor(totalSecondes / 60)
  const secondes = totalSecondes % 60
  return `${minutes}:${secondes.toString().padStart(2, '0')}`
}

export type NiveauMinuteur = 'nominal' | 'attention' | 'urgence'

/**
 * Code couleur du minuteur (voir spécification, lot 3) :
 * vert nominal, ambre sous 2 min, rouge sous 1 min.
 */
export function niveauMinuteur(restantMs: number): NiveauMinuteur {
  if (restantMs < 60_000) return 'urgence'
  if (restantMs < 120_000) return 'attention'
  return 'nominal'
}

/**
 * Mesure le décalage d'horloge via la RPC `server_now()`.
 * Compense la latence réseau en datant la réponse au milieu de l'aller-retour.
 * À appeler au chargement et à chaque reconnexion.
 */
export async function mesurerDecalage(): Promise<number> {
  const avant = Date.now()
  const { data, error } = await supabase.rpc('server_now')
  const apres = Date.now()
  if (error) throw error
  const serveurMs = new Date(data as string).getTime()
  const milieuClient = avant + (apres - avant) / 2
  return calculerDecalage(serveurMs, milieuClient)
}
