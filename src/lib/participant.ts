import { supabase } from './supabase'

/**
 * Parcours participant (lot 2) : connexion anonyme, entrée dans une équipe,
 * lecture de l'état.
 *
 * Rappel (voir CLAUDE.md) : côté participant, la SEULE source de données est
 * `get_team_view(team_id)`. Aucune écriture directe dans les tables : tout
 * passe par les RPC prévues. Un navigateur participant ne fait jamais avancer
 * une étape.
 */

const CLE_MEMOIRE = 'crise.equipe'

export interface EquipeMemorisee {
  equipeId: string
  prenom: string
}

/** Vue d'équipe renvoyée par `get_team_view` (sans réponses types ni barèmes). */
export interface VueEquipe {
  server_now: string
  session: { id: string; title: string; status: string }
  team: {
    id: string
    name: string
    status: string
    current_step: number
    step_count: number
    step_started_at: string | null
    step_deadline: string | null
    remaining_on_pause_seconds: number | null
    state_version: number
  }
  participants: { name: string }[]
  messages: { id: string; from_staff: boolean; body: string; created_at: string }[]
  step: {
    index: number
    title: string
    duration_seconds: number
    ambient_audio_path: string | null
    contents: Record<string, unknown>[]
    hints: { id: string; body: string }[]
    questions: Record<string, unknown>[]
  } | null
  drafts?: Record<string, unknown>
  submitted?: boolean
}

// ---------------------------------------------------------------------------
// Fonctions pures (testées unitairement)
// ---------------------------------------------------------------------------

/** Contrôle du prénom, aligné sur la contrainte de `participants.display_name`. */
export function validerPrenom(prenom: string): string | null {
  const nettoye = prenom.trim()
  if (nettoye.length === 0) return 'Indiquez votre prénom.'
  if (nettoye.length > 60) return 'Prénom trop long (60 caractères maximum).'
  return null
}

/**
 * Rend lisibles les erreurs remontées par `join_team()`.
 * Les messages métier de la base sont déjà en français : on les conserve.
 */
export function messageErreurEntree(erreur: unknown): string {
  const brut = erreur instanceof Error ? erreur.message : String(erreur)
  if (/Code d.équipe inconnu/i.test(brut)) {
    return 'Code inconnu. Vérifiez les six caractères affichés par l’animateur.'
  }
  if (/exercice est terminé/i.test(brut)) return 'Cet exercice est terminé.'
  if (/conditions de participation/i.test(brut)) {
    return 'Vous devez accepter les conditions pour participer.'
  }
  if (/Connexion requise/i.test(brut)) return 'Connexion impossible. Réessayez.'
  // Réglage du projet Supabase, et non une erreur de saisie du participant :
  // Authentication → Sign In / Providers → Anonymous sign-ins.
  if (/anonymous sign-?ins? (are )?disabled/i.test(brut)) {
    return (
      'Les connexions anonymes sont désactivées sur le projet Supabase. ' +
      'Un animateur doit les activer dans Authentication → Sign In / Providers → ' +
      'Anonymous sign-ins. Aucun compte participant n’est à créer.'
    )
  }
  return brut
}

/** L'exercice a-t-il commencé du point de vue de l'équipe ? */
export function exerciceEnCours(vue: VueEquipe): boolean {
  return vue.team.status === 'running' || vue.team.status === 'time_up'
}

// ---------------------------------------------------------------------------
// Mémorisation locale (pour rejoindre directement après un rechargement)
// ---------------------------------------------------------------------------

export function memoriserEquipe(equipe: EquipeMemorisee): void {
  try {
    localStorage.setItem(CLE_MEMOIRE, JSON.stringify(equipe))
  } catch {
    // Navigation privée ou stockage plein : on continue sans mémoriser.
  }
}

export function lireEquipeMemorisee(): EquipeMemorisee | null {
  try {
    const brut = localStorage.getItem(CLE_MEMOIRE)
    if (!brut) return null
    const valeur = JSON.parse(brut) as Partial<EquipeMemorisee>
    if (typeof valeur.equipeId !== 'string' || typeof valeur.prenom !== 'string') return null
    return { equipeId: valeur.equipeId, prenom: valeur.prenom }
  } catch {
    return null
  }
}

export function oublierEquipe(): void {
  try {
    localStorage.removeItem(CLE_MEMOIRE)
  } catch {
    // Sans importance : la mémorisation est un confort, pas une source de vérité.
  }
}

// ---------------------------------------------------------------------------
// Accès aux données
// ---------------------------------------------------------------------------

/** Ouvre une session anonyme si nécessaire (aucun compte, aucune adresse e-mail). */
export async function connexionAnonyme(): Promise<void> {
  const { data } = await supabase.auth.getSession()
  if (data.session) return
  const { error } = await supabase.auth.signInAnonymously()
  if (error) throw error
}

/** Connexion anonyme puis entrée dans l'équipe (RPC `join_team`). */
export async function rejoindreEquipe(
  code: string,
  prenom: string,
  accepteConditions: boolean,
): Promise<string> {
  await connexionAnonyme()
  const { data, error } = await supabase.rpc('join_team', {
    p_code: code,
    p_display_name: prenom.trim(),
    p_accept_terms: accepteConditions,
  })
  if (error) throw error
  const equipeId = data as string
  memoriserEquipe({ equipeId, prenom: prenom.trim() })
  return equipeId
}

/** Brouillon partagé entre les appareils de l'équipe (RPC `save_draft`). */
export async function enregistrerBrouillon(
  equipeId: string,
  questionId: string,
  contenu: unknown,
): Promise<void> {
  const { error } = await supabase.rpc('save_draft', {
    p_team_id: equipeId,
    p_question_id: questionId,
    p_content: contenu as never,
  })
  if (error) throw error
}

/** Validation unique de la réponse d'équipe pour l'étape (RPC `submit_answers`). */
export async function validerReponses(equipeId: string): Promise<void> {
  const { error } = await supabase.rpc('submit_answers', { p_team_id: equipeId })
  if (error) throw error
}

/** Message de l'équipe vers l'animateur (RPC `send_team_message`). */
export async function envoyerMessage(equipeId: string, corps: string): Promise<void> {
  const { error } = await supabase.rpc('send_team_message', {
    p_team_id: equipeId,
    p_body: corps,
  })
  if (error) throw error
}

/** Relecture complète de l'état : unique source de vérité côté participant. */
export async function chargerVueEquipe(equipeId: string): Promise<VueEquipe> {
  const { data, error } = await supabase.rpc('get_team_view', { p_team_id: equipeId })
  if (error) throw error
  return data as unknown as VueEquipe
}
