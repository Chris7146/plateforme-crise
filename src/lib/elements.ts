import { supabase } from './supabase'
import type { Database } from './database.types'

/**
 * Contenus diffusés, questions et indices d'une étape (lot 1).
 *
 * Rappel (voir CLAUDE.md) : `expected_answer` et `scoring_guide` ne quittent
 * jamais la console animateur. Le navigateur d'un participant ne lit que
 * `get_team_view()`, qui ne les expose pas.
 */

export type Contenu = Database['public']['Tables']['contents']['Row']
export type Question = Database['public']['Tables']['questions']['Row']
export type Indice = Database['public']['Tables']['hints']['Row']

export type TypeContenu = Database['public']['Enums']['content_type']
export type TypeQuestion = Database['public']['Enums']['question_type']
export type ModeDeclenchement = Database['public']['Enums']['trigger_mode']

export interface OptionQuestion {
  id: string
  label: string
}

export interface ElementsEtape {
  contenus: Contenu[]
  questions: Question[]
  indices: Indice[]
}

// ---------------------------------------------------------------------------
// Fonctions pures (testées unitairement)
// ---------------------------------------------------------------------------

const libellesContenu: Record<TypeContenu, string> = {
  video: 'vidéo',
  image: 'image',
  audio: 'audio',
  document: 'document',
  article: 'article',
  text: 'texte',
}

const libellesQuestion: Record<TypeQuestion, string> = {
  open: 'ouverte',
  single_choice: 'choix unique',
  multiple_choice: 'choix multiple',
  yes_no: 'oui/non',
}

export function libelleTypeContenu(type: TypeContenu): string {
  return libellesContenu[type]
}

export function libelleTypeQuestion(type: TypeQuestion): string {
  return libellesQuestion[type]
}

export const TYPES_CONTENU = Object.keys(libellesContenu) as TypeContenu[]
export const TYPES_QUESTION = Object.keys(libellesQuestion) as TypeQuestion[]

/** « auto · T+2 min » ou « manuel » (voir maquette `editeur-etapes.html`). */
export function libelleDeclenchement(mode: ModeDeclenchement, offsetSecondes: number): string {
  if (mode === 'manual') return 'manuel'
  const minutes = Math.round(offsetSecondes / 60)
  return minutes === 0 ? 'auto · T+0' : `auto · T+${minutes} min`
}

/** Un contenu de type média s'appuie sur un fichier du compartiment `media`. */
export function estMedia(type: TypeContenu): boolean {
  return type === 'video' || type === 'image' || type === 'audio' || type === 'document'
}

export function aBesoinOptions(type: TypeQuestion): boolean {
  return type === 'single_choice' || type === 'multiple_choice'
}

/** Lecture défensive du jsonb `options` : tout élément mal formé est ignoré. */
export function lireOptions(brut: unknown): OptionQuestion[] {
  if (!Array.isArray(brut)) return []
  return brut.flatMap((element) => {
    if (typeof element !== 'object' || element === null) return []
    const { id, label } = element as Record<string, unknown>
    if (typeof id !== 'string' || typeof label !== 'string') return []
    return [{ id, label }]
  })
}

/** Identifiants d'options lisibles : a, b, c… puis a2, b2… au-delà de 26. */
export function identifiantOption(index: number): string {
  const lettre = String.fromCharCode(97 + (index % 26))
  const cycle = Math.floor(index / 26)
  return cycle === 0 ? lettre : `${lettre}${cycle + 1}`
}

/** Contrôles de saisie d'une question ; renvoie le message d'erreur ou `null`. */
export function validerQuestion(
  type: TypeQuestion,
  prompt: string,
  options: OptionQuestion[],
): string | null {
  if (prompt.trim().length === 0) return 'L’intitulé de la question est obligatoire.'
  if (aBesoinOptions(type)) {
    const remplies = options.filter((o) => o.label.trim().length > 0)
    if (remplies.length < 2) return 'Une question à choix demande au moins deux options.'
  }
  return null
}

/** Résumé affiché sous l'intitulé : « attendu : … » ou rappel d'absence de barème. */
export function resumerAttendu(question: Pick<Question, 'expected_answer' | 'scoring_guide'>): string {
  const reponseType =
    typeof question.expected_answer === 'string' ? question.expected_answer.trim() : ''
  const bareme = question.scoring_guide?.trim() ?? ''
  if (reponseType.length === 0 && bareme.length === 0) return 'aucune réponse type saisie'
  const morceaux = []
  if (reponseType.length > 0) morceaux.push(reponseType)
  if (bareme.length > 0) morceaux.push(bareme)
  return `attendu : ${morceaux.join(' · ')}`
}

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

export async function chargerElements(etapeId: string): Promise<ElementsEtape> {
  const [contenus, questions, indices] = await Promise.all([
    supabase.from('contents').select('*').eq('step_id', etapeId).order('position'),
    supabase.from('questions').select('*').eq('step_id', etapeId).order('position'),
    supabase.from('hints').select('*').eq('step_id', etapeId).order('position'),
  ])
  if (contenus.error) throw contenus.error
  if (questions.error) throw questions.error
  if (indices.error) throw indices.error
  return { contenus: contenus.data, questions: questions.data, indices: indices.data }
}

type NouveauContenu = Database['public']['Tables']['contents']['Insert']
type NouvelleQuestion = Database['public']['Tables']['questions']['Insert']
type NouvelIndice = Database['public']['Tables']['hints']['Insert']

export async function enregistrerContenu(
  contenu: NouveauContenu & { id?: string },
): Promise<Contenu> {
  const requete = contenu.id
    ? supabase.from('contents').update(contenu).eq('id', contenu.id)
    : supabase.from('contents').insert(contenu)
  const { data, error } = await requete.select().single()
  if (error) throw error
  return data
}

export async function enregistrerQuestion(
  question: NouvelleQuestion & { id?: string },
): Promise<Question> {
  const requete = question.id
    ? supabase.from('questions').update(question).eq('id', question.id)
    : supabase.from('questions').insert(question)
  const { data, error } = await requete.select().single()
  if (error) throw error
  return data
}

export async function enregistrerIndice(indice: NouvelIndice & { id?: string }): Promise<Indice> {
  const requete = indice.id
    ? supabase.from('hints').update(indice).eq('id', indice.id)
    : supabase.from('hints').insert(indice)
  const { data, error } = await requete.select().single()
  if (error) throw error
  return data
}

type TableElement = 'contents' | 'questions' | 'hints'

export async function supprimerElement(table: TableElement, id: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}

/** Réécrit les positions dans l'ordre fourni (pas de RPC dédiée pour ces tables). */
export async function reordonnerElements(table: TableElement, ids: string[]): Promise<void> {
  const resultats = await Promise.all(
    ids.map((id, index) => supabase.from(table).update({ position: index }).eq('id', id)),
  )
  const echec = resultats.find((r) => r.error)
  if (echec?.error) throw echec.error
}
