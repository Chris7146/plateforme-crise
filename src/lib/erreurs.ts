/**
 * Lecture du message porté par une erreur, quelle que soit sa forme.
 *
 * `supabase-js` ne rejette pas toujours avec une `Error` : une erreur PostgREST
 * est un objet simple `{ message, details, hint, code }`. Le motif
 * `e instanceof Error ? e.message : '…'`, répété partout dans le projet,
 * perdait donc le message le plus utile. Au test du 29 octobre 2026, la
 * fonction `open_hint` absente de la base est restée invisible derrière un
 * « Indice indisponible pour l'instant ».
 */

function lireMessage(erreur: unknown): string | null {
  if (typeof erreur === 'string') return erreur
  if (erreur instanceof Error) return erreur.message
  if (typeof erreur === 'object' && erreur !== null) {
    const { message } = erreur as { message?: unknown }
    if (typeof message === 'string') return message
  }
  return null
}

/** Message à afficher, ou `defaut` si l'erreur n'en porte aucun. */
export function messageErreur(erreur: unknown, defaut: string): string {
  const message = lireMessage(erreur)
  return message !== null && message.trim().length > 0 ? message : defaut
}

/** Texte brut de l'erreur, pour la reconnaissance des cas connus. */
export function texteErreur(erreur: unknown): string {
  return lireMessage(erreur) ?? String(erreur)
}

/** Code PostgREST (`PGRST202` : fonction absente du schéma), si présent. */
export function codeErreur(erreur: unknown): string | null {
  if (typeof erreur === 'object' && erreur !== null) {
    const { code } = erreur as { code?: unknown }
    if (typeof code === 'string') return code
  }
  return null
}
