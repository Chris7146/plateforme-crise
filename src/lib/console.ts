import { supabase } from './supabase'
import type { Database } from './database.types'
import type { Equipe, Session } from './sessions'
import { lireOptions, type OptionQuestion, type TypeContenu, type TypeQuestion } from './elements'

/**
 * Console animateur (lot 4) : état des équipes, interventions, journal, notation.
 *
 * Toutes les interventions passent par les RPC animateur, qui vérifient le rôle
 * côté base (`_require_staff()`) et journalisent l'action. L'interface masque
 * les boutons, mais la sécurité ne dépend jamais de l'interface.
 *
 * Le contenu joué est lu dans `sessions.snapshot` — figé au démarrage — et non
 * dans la variante, qui a pu évoluer depuis.
 */

export type Reponse = Database['public']['Tables']['answers']['Row']
export type Note = Database['public']['Tables']['scores']['Row']
export type Message = Database['public']['Tables']['messages']['Row']
export type Evenement = Database['public']['Tables']['events']['Row']

// ---------------------------------------------------------------------------
// Lecture du snapshot (côté animateur : réponses types et barèmes autorisés)
// ---------------------------------------------------------------------------

export interface ItemSnapshot {
  id: string
  type: TypeContenu
  title: string
  body: string | null
  media_path: string | null
  trigger_mode: 'auto' | 'manual'
  trigger_offset_seconds: number
}

export interface IndiceSnapshot {
  id: string
  body: string
  trigger_mode: 'auto' | 'manual'
  trigger_offset_seconds: number
}

export interface QuestionSnapshot {
  id: string
  type: TypeQuestion
  prompt: string
  options: OptionQuestion[]
  mandatory: boolean
  expected_answer: unknown
  scoring_guide: string | null
}

export interface EtapeSnapshot {
  id: string
  position: number
  title: string
  duration_seconds: number
  end_of_time: 'auto' | 'facilitator'
  advance_on_submit: boolean
  ambient_audio_path: string | null
  contents: ItemSnapshot[]
  questions: QuestionSnapshot[]
  hints: IndiceSnapshot[]
}

export interface Snapshot {
  exercice: { id: string; title: string; max_content_score: number; max_time_bonus: number }
  etapes: EtapeSnapshot[]
}

function objet(valeur: unknown): Record<string, unknown> | null {
  return typeof valeur === 'object' && valeur !== null ? (valeur as Record<string, unknown>) : null
}

function chaine(valeur: unknown, defaut = ''): string {
  return typeof valeur === 'string' ? valeur : defaut
}

function nombre(valeur: unknown, defaut = 0): number {
  return typeof valeur === 'number' ? valeur : defaut
}

/** Lecture défensive du snapshot : un élément mal formé est ignoré. */
export function lireSnapshot(brut: unknown): Snapshot | null {
  const racine = objet(brut)
  if (!racine) return null
  const exercice = objet(racine.exercise)
  const etapesBrutes = Array.isArray(racine.steps) ? racine.steps : []

  return {
    exercice: {
      id: chaine(exercice?.id),
      title: chaine(exercice?.title),
      max_content_score: nombre(exercice?.max_content_score, 8),
      max_time_bonus: nombre(exercice?.max_time_bonus, 2),
    },
    etapes: etapesBrutes.flatMap((brute, index) => {
      const etape = objet(brute)
      if (!etape) return []
      return [
        {
          id: chaine(etape.id),
          position: nombre(etape.position, index),
          title: chaine(etape.title),
          duration_seconds: nombre(etape.duration_seconds),
          end_of_time: etape.end_of_time === 'auto' ? 'auto' : 'facilitator',
          advance_on_submit: etape.advance_on_submit === true,
          ambient_audio_path:
            typeof etape.ambient_audio_path === 'string' ? etape.ambient_audio_path : null,
          contents: (Array.isArray(etape.contents) ? etape.contents : []).flatMap((c) => {
            const contenu = objet(c)
            if (!contenu) return []
            return [
              {
                id: chaine(contenu.id),
                type: contenu.type as TypeContenu,
                title: chaine(contenu.title),
                body: typeof contenu.body === 'string' ? contenu.body : null,
                media_path: typeof contenu.media_path === 'string' ? contenu.media_path : null,
                trigger_mode: contenu.trigger_mode === 'manual' ? 'manual' : 'auto',
                trigger_offset_seconds: nombre(contenu.trigger_offset_seconds),
              },
            ]
          }),
          questions: (Array.isArray(etape.questions) ? etape.questions : []).flatMap((q) => {
            const question = objet(q)
            if (!question) return []
            return [
              {
                id: chaine(question.id),
                type: question.type as TypeQuestion,
                prompt: chaine(question.prompt),
                options: lireOptions(question.options),
                mandatory: question.mandatory !== false,
                expected_answer: question.expected_answer ?? null,
                scoring_guide:
                  typeof question.scoring_guide === 'string' ? question.scoring_guide : null,
              },
            ]
          }),
          hints: (Array.isArray(etape.hints) ? etape.hints : []).flatMap((h) => {
            const indice = objet(h)
            if (!indice) return []
            return [
              {
                id: chaine(indice.id),
                body: chaine(indice.body),
                trigger_mode: indice.trigger_mode === 'auto' ? 'auto' : 'manual',
                trigger_offset_seconds: nombre(indice.trigger_offset_seconds),
              },
            ]
          }),
        },
      ]
    }),
  }
}

// ---------------------------------------------------------------------------
// Statut d'une équipe, tel qu'affiché sur sa carte
// ---------------------------------------------------------------------------

export type StatutEquipe =
  | 'en_attente'
  | 'a_noter'
  | 'temps_ecoule'
  | 'en_retard'
  | 'en_avance'
  | 'a_l_heure'
  | 'terminee'

const libellesStatut: Record<StatutEquipe, string> = {
  en_attente: 'en attente',
  a_noter: 'réponse à noter',
  temps_ecoule: 'temps écoulé',
  en_retard: 'en retard',
  en_avance: 'en avance',
  a_l_heure: 'à l’heure',
  terminee: 'terminée',
}

export function libelleStatutEquipe(statut: StatutEquipe): string {
  return libellesStatut[statut]
}

const tonsStatut: Record<StatutEquipe, 'vert' | 'ambre' | 'rouge' | 'bleu' | 'neutre'> = {
  en_attente: 'neutre',
  a_noter: 'ambre',
  temps_ecoule: 'ambre',
  en_retard: 'rouge',
  en_avance: 'bleu',
  a_l_heure: 'vert',
  terminee: 'neutre',
}

export function tonStatutEquipe(statut: StatutEquipe): 'vert' | 'ambre' | 'rouge' | 'bleu' | 'neutre' {
  return tonsStatut[statut]
}

/** Médiane des étapes atteintes : référence d'avancement du groupe. */
export function medianeEtapes(equipes: Pick<Equipe, 'current_step'>[]): number {
  if (equipes.length === 0) return 0
  const triees = equipes.map((e) => e.current_step).sort((a, b) => a - b)
  const milieu = Math.floor(triees.length / 2)
  return triees.length % 2 === 1 ? triees[milieu] : (triees[milieu - 1] + triees[milieu]) / 2
}

/**
 * Statut d'une équipe. Priorité : une réponse à noter ou un temps écoulé
 * demandent une action de l'animateur, et passent donc devant l'avancement.
 *
 * L'avance et le retard se mesurent par rapport à la médiane des équipes
 * (décision du lot 4 : c'est l'écart entre équipes qui parle à l'animateur en
 * salle, pas l'écart au minutage théorique).
 */
export function statutEquipe(
  equipe: Pick<Equipe, 'status' | 'current_step'>,
  contexte: { mediane: number; aReponseANoter: boolean },
): StatutEquipe {
  if (equipe.status === 'finished') return 'terminee'
  if (equipe.status === 'waiting') return 'en_attente'
  if (contexte.aReponseANoter) return 'a_noter'
  if (equipe.status === 'time_up') return 'temps_ecoule'
  if (equipe.current_step < contexte.mediane) return 'en_retard'
  if (equipe.current_step > contexte.mediane) return 'en_avance'
  return 'a_l_heure'
}

/** Étapes pour lesquelles l'équipe a répondu sans avoir encore reçu de note. */
export function etapesANoter(
  equipeId: string,
  reponses: Pick<Reponse, 'team_id' | 'step_index'>[],
  notes: Pick<Note, 'team_id' | 'step_index' | 'content_score'>[],
): number[] {
  const notees = new Set(
    notes
      .filter((n) => n.team_id === equipeId && n.content_score !== null)
      .map((n) => n.step_index),
  )
  const repondues = new Set(
    reponses.filter((r) => r.team_id === equipeId).map((r) => r.step_index),
  )
  return [...repondues].filter((etape) => !notees.has(etape)).sort((a, b) => a - b)
}

export function messagesNonLus(equipeId: string, messages: Message[]): number {
  return messages.filter((m) => m.team_id === equipeId && !m.from_staff && m.read_at === null)
    .length
}

/** Contenus et indices à déclenchement manuel de l'étape courante d'une équipe. */
export function itemsManuels(snapshot: Snapshot | null, indexEtape: number) {
  const etape = snapshot?.etapes[indexEtape]
  return {
    contenus: (etape?.contents ?? []).filter((c) => c.trigger_mode === 'manual'),
    indices: etape?.hints ?? [],
  }
}

/** Résumé d'un événement du journal, en français. */
export function libelleEvenement(evenement: Pick<Evenement, 'type' | 'payload'>): string {
  const charge = objet(evenement.payload) ?? {}
  switch (evenement.type) {
    case 'session_started':
      return 'exercice démarré'
    case 'session_paused':
      return 'pause générale'
    case 'session_resumed':
      return 'reprise'
    case 'session_finished':
      return 'exercice terminé'
    case 'session_stopped':
      return 'arrêt général'
    case 'participant_joined':
      return `${chaine(charge.display_name, 'un participant')} a rejoint`
    case 'step_advanced':
      return `passage à l’étape ${nombre(charge.step_index) + 1}`
    case 'time_up':
      return `temps écoulé (étape ${nombre(charge.step_index) + 1})`
    case 'time_changed': {
      const secondes = nombre(charge.seconds)
      const minutes = Math.round(Math.abs(secondes) / 60)
      return `${secondes >= 0 ? '+' : '−'} ${minutes} min`
    }
    case 'answers_submitted':
      return `réponse validée (étape ${nombre(charge.step_index) + 1})`
    case 'answers_scored':
      return `note attribuée : ${nombre(charge.content_score)}`
    case 'content_released':
      return 'contenu diffusé'
    case 'hint_sent':
      return 'indice envoyé'
    case 'message_sent':
      return `message : « ${chaine(charge.body)} »`
    case 'call_opened':
      return 'lien visio ouvert'
    default:
      return evenement.type
  }
}

// ---------------------------------------------------------------------------
// Chargement de l'état de la console
// ---------------------------------------------------------------------------

export interface EtatConsole {
  session: Session
  equipes: Equipe[]
  snapshot: Snapshot | null
  reponses: Reponse[]
  notes: Note[]
  messages: Message[]
  journal: Evenement[]
  connectes: Record<string, number>
}

export async function chargerConsole(sessionId: string): Promise<EtatConsole | null> {
  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle()
  if (error) throw error
  if (!session) return null

  const [equipes, messages, journal] = await Promise.all([
    supabase.from('teams').select('*').eq('session_id', sessionId).order('created_at'),
    supabase.from('messages').select('*').eq('session_id', sessionId).order('created_at'),
    supabase
      .from('events')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(200),
  ])
  if (equipes.error) throw equipes.error
  if (messages.error) throw messages.error
  if (journal.error) throw journal.error

  const identifiants = equipes.data.map((e) => e.id)
  const [reponses, notes, participants] = await Promise.all([
    supabase.from('answers').select('*').in('team_id', identifiants),
    supabase.from('scores').select('*').in('team_id', identifiants),
    supabase.from('participants').select('team_id').in('team_id', identifiants),
  ])
  if (reponses.error) throw reponses.error
  if (notes.error) throw notes.error
  if (participants.error) throw participants.error

  const connectes: Record<string, number> = {}
  for (const participant of participants.data) {
    connectes[participant.team_id] = (connectes[participant.team_id] ?? 0) + 1
  }

  return {
    session,
    equipes: equipes.data,
    snapshot: lireSnapshot(session.snapshot),
    reponses: reponses.data,
    notes: notes.data,
    messages: messages.data,
    journal: journal.data,
    connectes,
  }
}

// ---------------------------------------------------------------------------
// Interventions (toutes journalisées côté base)
// ---------------------------------------------------------------------------

export async function ajouterTemps(equipeId: string, secondes: number): Promise<void> {
  const { error } = await supabase.rpc('add_time', {
    p_team_id: equipeId,
    p_seconds: secondes,
  })
  if (error) throw error
}

export async function etapeSuivante(equipeId: string): Promise<void> {
  const { error } = await supabase.rpc('advance_team', { p_team_id: equipeId })
  if (error) throw error
}

export async function diffuser(
  sessionId: string,
  genre: 'content' | 'hint',
  itemId: string,
  equipeIds: string[] | null,
): Promise<void> {
  // Omettre p_team_ids vaut « toutes les équipes » côté base (défaut null).
  const { error } = await supabase.rpc('release_item', {
    p_session_id: sessionId,
    p_kind: genre,
    p_item_id: itemId,
    ...(equipeIds ? { p_team_ids: equipeIds } : {}),
  })
  if (error) throw error
}

export async function envoyerMessageAnimateur(equipeId: string, corps: string): Promise<void> {
  const { error } = await supabase.rpc('send_staff_message', {
    p_team_id: equipeId,
    p_body: corps,
  })
  if (error) throw error
}

export async function mettreEnPause(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('pause_session', { p_session_id: sessionId })
  if (error) throw error
}

export async function reprendre(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('resume_session', { p_session_id: sessionId })
  if (error) throw error
}

export async function terminer(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('finish_session', { p_session_id: sessionId })
  if (error) throw error
}

/** Arrêt général : interruption immédiate pour toutes les équipes. */
export async function arreter(sessionId: string): Promise<void> {
  const { error } = await supabase.rpc('stop_session', { p_session_id: sessionId })
  if (error) throw error
}

export async function noter(
  equipeId: string,
  indexEtape: number,
  note: number,
): Promise<void> {
  const { error } = await supabase.rpc('score_answers', {
    p_team_id: equipeId,
    p_step_index: indexEtape,
    p_content_score: note,
  })
  if (error) throw error
}

export async function enregistrerLienVisio(sessionId: string, url: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .update({ call_url: url.trim() || null })
    .eq('id', sessionId)
  if (error) throw error
}

/** Journalise l'ouverture du lien visio (l'appel reste externe en V1). */
export async function journaliserVisio(sessionId: string, equipeId?: string): Promise<void> {
  const { error } = await supabase.rpc('log_call_opened', {
    p_session_id: sessionId,
    ...(equipeId ? { p_team_id: equipeId } : {}),
  })
  if (error) throw error
}

export async function marquerMessagesLus(equipeId: string): Promise<void> {
  const { error } = await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('team_id', equipeId)
    .eq('from_staff', false)
    .is('read_at', null)
  if (error) throw error
}
