import { supabase } from './supabase'
import type { Database } from './database.types'
import type { Etape } from './exercices'

/**
 * Édition des étapes d'un modèle ou d'une variante (lot 1).
 *
 * L'ordre est porté par `steps.position` et réécrit uniquement par la RPC
 * `reorder_steps()`, qui reçoit la liste complète des identifiants dans le
 * nouvel ordre. Les écritures animateur passent par les règles d'accès
 * `*_staff` : aucune clé secrète, aucune RPC de contournement.
 */

export type ModeFinTemps = Database['public']['Enums']['end_of_time']

/** Bornes de durée d'une étape, en minutes (voir spécification, lot 1). */
export const DUREE_MIN_MINUTES = 1
export const DUREE_MAX_MINUTES = 60

export interface ChampsEtape {
  title: string
  duration_seconds: number
  end_of_time: ModeFinTemps
  advance_on_submit: boolean
}

// ---------------------------------------------------------------------------
// Fonctions pures (testées unitairement)
// ---------------------------------------------------------------------------

/** Déplace un élément d'un index à un autre, sans muter le tableau d'origine. */
export function deplacer<T>(elements: readonly T[], de: number, vers: number): T[] {
  if (de === vers || de < 0 || vers < 0 || de >= elements.length || vers >= elements.length) {
    return [...elements]
  }
  const copie = [...elements]
  const [element] = copie.splice(de, 1)
  copie.splice(vers, 0, element)
  return copie
}

/** Borne une saisie en minutes aux limites autorisées ; `null` si illisible. */
export function normaliserMinutes(saisie: string): number | null {
  const minutes = Number.parseInt(saisie, 10)
  if (!Number.isFinite(minutes)) return null
  return Math.min(DUREE_MAX_MINUTES, Math.max(DUREE_MIN_MINUTES, minutes))
}

export function secondesVersMinutes(secondes: number): number {
  return Math.round(secondes / 60)
}

/** Libellé du réglage « fin du temps » (voir maquette `editeur-etapes.html`). */
export function libelleFinTemps(mode: ModeFinTemps): string {
  return mode === 'auto' ? 'passage automatique' : 'attendre l’animateur'
}

/** Une étape est « modifiée » si elle dérive d'un modèle et a été retouchée. */
export function estModifiee(etape: Pick<Etape, 'source_id' | 'is_modified'>): boolean {
  return etape.source_id !== null && etape.is_modified
}

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

/** Ajoute une étape en fin de liste. */
export async function creerEtape(exerciceId: string, position: number): Promise<Etape> {
  const { data, error } = await supabase
    .from('steps')
    .insert({
      exercise_id: exerciceId,
      position,
      title: 'Nouvelle étape',
      duration_seconds: 5 * 60,
      end_of_time: 'facilitator',
    })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function majEtape(etapeId: string, champs: Partial<ChampsEtape>): Promise<Etape> {
  const { data, error } = await supabase
    .from('steps')
    .update(champs)
    .eq('id', etapeId)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function supprimerEtape(etapeId: string): Promise<void> {
  const { error } = await supabase.from('steps').delete().eq('id', etapeId)
  if (error) throw error
}

/** Réécrit l'ordre complet des étapes (RPC `reorder_steps`). */
export async function reordonnerEtapes(exerciceId: string, idsOrdonnes: string[]): Promise<void> {
  const { error } = await supabase.rpc('reorder_steps', {
    p_exercise_id: exerciceId,
    p_step_ids: idsOrdonnes,
  })
  if (error) throw error
}
