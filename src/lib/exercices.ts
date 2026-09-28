import { supabase } from './supabase'
import type { Database } from './database.types'

/**
 * Accès aux modèles et variantes (lot 1).
 *
 * Rappel (voir CLAUDE.md) : une variante se crée UNIQUEMENT via la RPC
 * `create_variant()`, qui réalise une copie figée. Aucune propagation d'un
 * modèle vers ses variantes ; la filiation est conservée dans `source_id`.
 */

export type Exercice = Database['public']['Tables']['exercises']['Row']
export type Client = Database['public']['Tables']['clients']['Row']
export type Etape = Database['public']['Tables']['steps']['Row']

/** Durée et nombre d'étapes agrégés, pour l'affichage des listes. */
export interface ResumeExercice {
  exercice: Exercice
  nomClient: string | null
  nbEtapes: number
  dureeSecondes: number
}

export interface GroupeModele {
  modele: ResumeExercice
  variantes: ResumeExercice[]
}

export interface ListeGroupee {
  groupes: GroupeModele[]
  /** Variantes dont le modèle d'origine a été supprimé (`source_id` orphelin). */
  orphelines: ResumeExercice[]
}

// ---------------------------------------------------------------------------
// Fonctions pures (testées unitairement)
// ---------------------------------------------------------------------------

/** Durée cumulée au format « 0 h 53 », comme dans la maquette de l'éditeur. */
export function formaterDuree(secondes: number): string {
  const totalMinutes = Math.round(Math.max(0, secondes) / 60)
  const heures = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${heures} h ${minutes.toString().padStart(2, '0')}`
}

/** « 6 étapes · 0 h 53 » (ou « aucune étape » si l'exercice est vide). */
export function resumerCharge(nbEtapes: number, dureeSecondes: number): string {
  if (nbEtapes === 0) return 'aucune étape'
  const etapes = nbEtapes === 1 ? '1 étape' : `${nbEtapes} étapes`
  return `${etapes} · ${formaterDuree(dureeSecondes)}`
}

type EtapeAgregee = Pick<Etape, 'exercise_id' | 'duration_seconds'>

/** Assemble exercices, étapes et clients en résumés prêts à afficher. */
export function resumerExercices(
  exercices: Exercice[],
  etapes: EtapeAgregee[],
  clients: Client[],
): ResumeExercice[] {
  const nomsClients = new Map(clients.map((c) => [c.id, c.name]))
  const agregats = new Map<string, { nbEtapes: number; dureeSecondes: number }>()
  for (const etape of etapes) {
    const courant = agregats.get(etape.exercise_id) ?? { nbEtapes: 0, dureeSecondes: 0 }
    courant.nbEtapes += 1
    courant.dureeSecondes += etape.duration_seconds
    agregats.set(etape.exercise_id, courant)
  }
  return exercices.map((exercice) => {
    const agregat = agregats.get(exercice.id)
    return {
      exercice,
      nomClient: exercice.client_id ? (nomsClients.get(exercice.client_id) ?? null) : null,
      nbEtapes: agregat?.nbEtapes ?? 0,
      dureeSecondes: agregat?.dureeSecondes ?? 0,
    }
  })
}

/** Regroupe chaque variante sous son modèle d'origine, par ordre alphabétique. */
export function regrouperParModele(resumes: ResumeExercice[]): ListeGroupee {
  const parTitre = (a: ResumeExercice, b: ResumeExercice) =>
    a.exercice.title.localeCompare(b.exercice.title, 'fr')

  const modeles = resumes.filter((r) => r.exercice.kind === 'template').sort(parTitre)
  const variantes = resumes.filter((r) => r.exercice.kind === 'variant')
  const identifiantsModeles = new Set(modeles.map((m) => m.exercice.id))

  const groupes = modeles.map((modele) => ({
    modele,
    variantes: variantes.filter((v) => v.exercice.source_id === modele.exercice.id).sort(parTitre),
  }))

  const orphelines = variantes
    .filter((v) => v.exercice.source_id === null || !identifiantsModeles.has(v.exercice.source_id))
    .sort(parTitre)

  return { groupes, orphelines }
}

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

/** Charge tous les exercices visibles par l'animateur, avec leurs agrégats. */
export async function chargerExercices(): Promise<ResumeExercice[]> {
  const [exercices, etapes, clients] = await Promise.all([
    supabase.from('exercises').select('*'),
    supabase.from('steps').select('exercise_id, duration_seconds'),
    supabase.from('clients').select('*'),
  ])
  if (exercices.error) throw exercices.error
  if (etapes.error) throw etapes.error
  if (clients.error) throw clients.error
  return resumerExercices(exercices.data, etapes.data, clients.data)
}

export async function listerClients(): Promise<Client[]> {
  const { data, error } = await supabase.from('clients').select('*').order('name')
  if (error) throw error
  return data
}

export async function creerClient(nom: string): Promise<Client> {
  const { data, error } = await supabase
    .from('clients')
    .insert({ name: nom.trim() })
    .select()
    .single()
  if (error) throw error
  return data
}

/** Crée un modèle vide (tronc commun). Les variantes passent par `create_variant()`. */
export async function creerModele(titre: string, description: string | null): Promise<string> {
  const { data: utilisateur } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('exercises')
    .insert({
      kind: 'template',
      title: titre.trim(),
      description: description?.trim() || null,
      created_by: utilisateur.user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

/** Copie figée d'un modèle vers un client donné (RPC `create_variant`). */
export async function creerVariante(
  modeleId: string,
  clientId: string,
  titre: string,
): Promise<string> {
  const { data, error } = await supabase.rpc('create_variant', {
    p_template_id: modeleId,
    p_client_id: clientId,
    p_title: titre.trim(),
  })
  if (error) throw error
  return data
}

/** Charge un exercice et ses étapes, triées par position. */
export async function chargerExercice(
  id: string,
): Promise<{ exercice: Exercice; etapes: Etape[] } | null> {
  const [exercice, etapes] = await Promise.all([
    supabase.from('exercises').select('*').eq('id', id).maybeSingle(),
    supabase.from('steps').select('*').eq('exercise_id', id).order('position'),
  ])
  if (exercice.error) throw exercice.error
  if (etapes.error) throw etapes.error
  if (!exercice.data) return null
  return { exercice: exercice.data, etapes: etapes.data }
}
