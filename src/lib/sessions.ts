import { supabase } from './supabase'
import type { Database } from './database.types'
import type { Exercice } from './exercices'

/**
 * Sessions jouées et équipes (lot 2).
 *
 * Une session démarrée est figée : `start_session()` copie le contenu dans
 * `sessions.snapshot`, et la session ne relit plus jamais la variante.
 * Le démarrage, comme tout passage d'étape, est décidé par le serveur.
 */

export type Session = Database['public']['Tables']['sessions']['Row']
export type Equipe = Database['public']['Tables']['teams']['Row']
export type StatutSession = Database['public']['Enums']['session_status']

export interface ResumeSession {
  session: Session
  titreExercice: string | null
  nbEquipes: number
}

// ---------------------------------------------------------------------------
// Fonctions pures (testées unitairement)
// ---------------------------------------------------------------------------

const libellesStatut: Record<StatutSession, string> = {
  draft: 'brouillon',
  running: 'en cours',
  paused: 'en pause',
  finished: 'terminée',
  stopped: 'arrêtée',
}

export function libelleStatutSession(statut: StatutSession): string {
  return libellesStatut[statut]
}

/** Couleur du badge : vert nominal, ambre attention, rouge urgence. */
export function tonStatutSession(statut: StatutSession): 'neutre' | 'attention' | 'variante' {
  if (statut === 'running') return 'variante'
  if (statut === 'paused' || statut === 'stopped') return 'attention'
  return 'neutre'
}

/** Une session n'est modifiable (équipes, titre) que tant qu'elle est en brouillon. */
export function estModifiable(statut: StatutSession): boolean {
  return statut === 'draft'
}

/**
 * Nettoie un code saisi à la main : majuscules, sans espace ni tiret.
 * L'alphabet des codes exclut déjà I, O, 0 et 1 (caractères ambigus).
 */
export function normaliserCode(saisie: string): string {
  return saisie
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)
}

export function codeComplet(code: string): boolean {
  return normaliserCode(code).length === 6
}

/** Adresse à encoder dans le QR code d'une équipe. */
export function urlRejoindre(code: string, origine: string): string {
  return `${origine.replace(/\/$/, '')}/?code=${normaliserCode(code)}`
}

/**
 * Une adresse en « localhost » ne désigne que l'appareil qui l'ouvre : un QR
 * code ou un code saisi depuis une tablette ne mènerait nulle part. En salle,
 * la console doit être ouverte sur l'adresse réseau de la machine.
 */
export function origineJoignableParLesParticipants(origine: string): boolean {
  return !/^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|$)/i.test(origine)
}

/** Noms proposés à la création groupée : « Équipe 1 », « Équipe 2 »… */
export function nomsEquipesParDefaut(nombre: number, deja = 0): string[] {
  return Array.from({ length: Math.max(0, nombre) }, (_, i) => `Équipe ${deja + i + 1}`)
}

/** Conditions de démarrage vérifiées aussi par `start_session()` côté base. */
export function raisonDemarrageImpossible(
  session: Session,
  equipes: Equipe[],
  nbEtapes: number,
): string | null {
  if (session.status !== 'draft') return 'La session a déjà été démarrée.'
  if (equipes.length === 0) return 'Ajoutez au moins une équipe avant de démarrer.'
  if (nbEtapes === 0) return 'L’exercice ne comporte aucune étape.'
  return null
}

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

export async function chargerSessions(): Promise<ResumeSession[]> {
  const [sessions, exercices, equipes] = await Promise.all([
    supabase.from('sessions').select('*').order('created_at', { ascending: false }),
    supabase.from('exercises').select('id, title'),
    supabase.from('teams').select('session_id'),
  ])
  if (sessions.error) throw sessions.error
  if (exercices.error) throw exercices.error
  if (equipes.error) throw equipes.error

  const titres = new Map(exercices.data.map((e) => [e.id, e.title]))
  return sessions.data.map((session) => ({
    session,
    titreExercice: titres.get(session.exercise_id) ?? null,
    nbEquipes: equipes.data.filter((t) => t.session_id === session.id).length,
  }))
}

export async function creerSession(exerciceId: string, titre: string): Promise<string> {
  const { data: utilisateur } = await supabase.auth.getUser()
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      exercise_id: exerciceId,
      title: titre.trim(),
      created_by: utilisateur.user?.id ?? null,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

export interface DetailSession {
  session: Session
  exercice: Exercice
  equipes: Equipe[]
  nbEtapes: number
  dureeSecondes: number
}

export async function chargerSession(id: string): Promise<DetailSession | null> {
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (error) throw error
  if (!session) return null

  const [exercice, equipes, etapes] = await Promise.all([
    supabase.from('exercises').select('*').eq('id', session.exercise_id).single(),
    supabase.from('teams').select('*').eq('session_id', id).order('created_at'),
    supabase.from('steps').select('duration_seconds').eq('exercise_id', session.exercise_id),
  ])
  if (exercice.error) throw exercice.error
  if (equipes.error) throw equipes.error
  if (etapes.error) throw etapes.error

  return {
    session,
    exercice: exercice.data,
    equipes: equipes.data,
    nbEtapes: etapes.data.length,
    dureeSecondes: etapes.data.reduce((total, e) => total + e.duration_seconds, 0),
  }
}

/** Le code d'accès est engendré côté base (valeur par défaut `generate_join_code()`). */
export async function creerEquipes(sessionId: string, noms: string[]): Promise<Equipe[]> {
  const { data, error } = await supabase
    .from('teams')
    .insert(noms.map((name) => ({ session_id: sessionId, name: name.trim() })))
    .select()
  if (error) throw error
  return data
}

export async function renommerEquipe(equipeId: string, nom: string): Promise<void> {
  const { error } = await supabase.from('teams').update({ name: nom.trim() }).eq('id', equipeId)
  if (error) throw error
}

export async function supprimerEquipe(equipeId: string): Promise<void> {
  const { error } = await supabase.from('teams').delete().eq('id', equipeId)
  if (error) throw error
}

/** Fige le contenu et lance toutes les équipes (RPC `start_session`). */
export async function demarrerSession(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('start_session', { p_session_id: sessionId })
  if (error) throw error
}
