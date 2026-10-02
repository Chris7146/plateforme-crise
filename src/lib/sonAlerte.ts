/**
 * Signal sonore d'arrivée d'un indice.
 *
 * Deux notes brèves synthétisées par Web Audio : aucun fichier à charger, donc
 * aucune latence ni dépendance au réseau, et un timbre nettement distinct du
 * son d'ambiance (continu) comme de la voix de l'animateur.
 *
 * Le son n'est qu'un renfort : le panneau reste parfaitement lisible sans lui.
 * Toute erreur est donc ignorée en silence (navigateur sans Web Audio, lecture
 * bloquée faute de geste de l'utilisateur, onglet en arrière-plan…).
 *
 * Plusieurs appareils sonnent dans la même salle : la coupure du son est un
 * réglage par appareil, mémorisé dans le navigateur.
 */

const CLE_SON = 'crise.sonIndices'

/** Le son d'alerte est actif par défaut, sauf coupure par le participant. */
export function sonActif(): boolean {
  try {
    return localStorage.getItem(CLE_SON) !== 'coupe'
  } catch {
    // Navigation privée ou stockage refusé : on garde le comportement par défaut.
    return true
  }
}

export function reglerSon(actif: boolean): void {
  try {
    localStorage.setItem(CLE_SON, actif ? 'actif' : 'coupe')
  } catch {
    // Le réglage ne survivra pas au rechargement : sans gravité.
  }
}

type FabriqueContexte = typeof AudioContext

let contexte: AudioContext | null = null

function contexteAudio(): AudioContext | null {
  if (contexte) return contexte
  const fenetre = window as Window & { webkitAudioContext?: FabriqueContexte }
  const Fabrique = window.AudioContext ?? fenetre.webkitAudioContext
  if (!Fabrique) return null
  contexte = new Fabrique()
  return contexte
}

/** Une note courte, enveloppe douce pour éviter le claquement. */
function note(ctx: AudioContext, frequence: number, debut: number, duree: number): void {
  const oscillateur = ctx.createOscillator()
  const gain = ctx.createGain()
  oscillateur.type = 'triangle'
  oscillateur.frequency.value = frequence
  gain.gain.setValueAtTime(0, debut)
  gain.gain.linearRampToValueAtTime(0.08, debut + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree)
  oscillateur.connect(gain).connect(ctx.destination)
  oscillateur.start(debut)
  oscillateur.stop(debut + duree + 0.02)
}

/**
 * Deux notes montantes (880 puis 1320 Hz) : « ti-dong » bref et reconnaissable.
 * Ne joue rien si le participant a coupé le son.
 */
export function jouerSignalIndice(): void {
  if (!sonActif()) return
  try {
    const ctx = contexteAudio()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    const maintenant = ctx.currentTime
    note(ctx, 880, maintenant, 0.12)
    note(ctx, 1320, maintenant + 0.14, 0.18)
  } catch {
    // Audio bloqué ou indisponible : le visuel suffit, aucun message d'erreur.
  }
}
