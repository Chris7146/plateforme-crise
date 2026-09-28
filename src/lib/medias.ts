import { supabase } from './supabase'
import type { TypeContenu } from './elements'

/**
 * Téléversement des médias dans le compartiment privé `media` (lot 1).
 *
 * Le compartiment n'est jamais public : la lecture passe par une URL signée,
 * et côté participant par la règle `media_participant_read` (fonction
 * `can_view_media`), qui n'autorise que les médias effectivement diffusés.
 */

export const COMPARTIMENT = 'media'

/** Au-delà de ce volume, on avertit l'animateur et on conseille une compression. */
export const SEUIL_AVERTISSEMENT_OCTETS = 50 * 1024 * 1024

// ---------------------------------------------------------------------------
// Fonctions pures (testées unitairement)
// ---------------------------------------------------------------------------

/** Nom de fichier sûr pour le stockage : ASCII, minuscules, sans espace. */
export function nettoyerNomFichier(nom: string): string {
  const sansAccents = nom.normalize('NFD').replace(/[̀-ͯ]/g, '')
  const nettoye = sansAccents
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return nettoye.length > 0 ? nettoye.slice(0, 80) : 'fichier'
}

export function formaterTaille(octets: number): string {
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${Math.round(octets / 1024)} ko`
  return `${(octets / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

export function estTropVolumineux(octets: number): boolean {
  return octets > SEUIL_AVERTISSEMENT_OCTETS
}

/** Devine le type de contenu à partir du type MIME du fichier choisi. */
export function typeContenuDepuisMime(mime: string): TypeContenu {
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  return 'document'
}

/** Chemin de stockage : un dossier par exercice, nom horodaté pour éviter les collisions. */
export function cheminMedia(exerciceId: string, nomFichier: string, horodatage = Date.now()): string {
  return `${exerciceId}/${horodatage}-${nettoyerNomFichier(nomFichier)}`
}

// ---------------------------------------------------------------------------
// Accès au stockage
// ---------------------------------------------------------------------------

/** Téléverse un fichier et renvoie son chemin dans le compartiment. */
export async function televerserMedia(exerciceId: string, fichier: File): Promise<string> {
  const chemin = cheminMedia(exerciceId, fichier.name)
  const { error } = await supabase.storage.from(COMPARTIMENT).upload(chemin, fichier, {
    contentType: fichier.type || undefined,
    upsert: false,
  })
  if (error) throw error
  return chemin
}

/** URL signée temporaire, pour la prévisualisation côté animateur. */
export async function urlSigneeMedia(chemin: string, secondes = 3600): Promise<string> {
  const { data, error } = await supabase.storage
    .from(COMPARTIMENT)
    .createSignedUrl(chemin, secondes)
  if (error) throw error
  return data.signedUrl
}

export async function supprimerMedia(chemin: string): Promise<void> {
  const { error } = await supabase.storage.from(COMPARTIMENT).remove([chemin])
  if (error) throw error
}
