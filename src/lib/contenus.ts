import type { TypeContenu, TypeQuestion, OptionQuestion } from './elements'
import { lireOptions } from './elements'

/**
 * Lecture des éléments diffusés à l'équipe et format des réponses (lot 3).
 *
 * Tout vient de `get_team_view()`, donc du snapshot figé : les contenus non
 * diffusés, les étapes à venir, les réponses types et les barèmes n'y figurent
 * jamais. La lecture est défensive : un élément mal formé est ignoré plutôt que
 * de casser l'écran d'un participant en pleine séance.
 */

export interface ContenuDiffuse {
  id: string
  type: TypeContenu
  title: string
  body: string | null
  media_path: string | null
}

export interface QuestionDiffusee {
  id: string
  type: TypeQuestion
  prompt: string
  options: OptionQuestion[]
  mandatory: boolean
}

const typesContenu = new Set<TypeContenu>(['video', 'image', 'audio', 'document', 'article', 'text'])
const typesQuestion = new Set<TypeQuestion>(['open', 'single_choice', 'multiple_choice', 'yes_no'])

function texte(valeur: unknown): string | null {
  return typeof valeur === 'string' && valeur.length > 0 ? valeur : null
}

export function lireContenus(brut: unknown): ContenuDiffuse[] {
  if (!Array.isArray(brut)) return []
  return brut.flatMap((element) => {
    if (typeof element !== 'object' || element === null) return []
    const c = element as Record<string, unknown>
    const id = texte(c.id)
    const type = c.type as TypeContenu
    if (!id || !typesContenu.has(type)) return []
    return [
      {
        id,
        type,
        title: texte(c.title) ?? '',
        body: texte(c.body),
        media_path: texte(c.media_path),
      },
    ]
  })
}

export function lireQuestions(brut: unknown): QuestionDiffusee[] {
  if (!Array.isArray(brut)) return []
  return brut.flatMap((element) => {
    if (typeof element !== 'object' || element === null) return []
    const q = element as Record<string, unknown>
    const id = texte(q.id)
    const type = q.type as TypeQuestion
    if (!id || !typesQuestion.has(type)) return []
    return [
      {
        id,
        type,
        prompt: texte(q.prompt) ?? '',
        options: lireOptions(q.options),
        mandatory: q.mandatory !== false,
      },
    ]
  })
}

// ---------------------------------------------------------------------------
// Format des réponses (brouillons et réponses validées)
//
// Décision de format, identique pour `answer_drafts.content` et
// `answers.content` :
//   ouverte        → { "text": "…" }
//   choix unique   → { "choice": "a" }
//   choix multiple → { "choices": ["a", "b"] }
//   oui / non      → { "yes": true }
// ---------------------------------------------------------------------------

export type Reponse =
  | { text: string }
  | { choice: string | null }
  | { choices: string[] }
  | { yes: boolean | null }

/** Réponse vide correspondant au type de question. */
export function reponseVide(type: TypeQuestion): Reponse {
  if (type === 'open') return { text: '' }
  if (type === 'single_choice') return { choice: null }
  if (type === 'multiple_choice') return { choices: [] }
  return { yes: null }
}

export function lireTexte(reponse: unknown): string {
  if (typeof reponse !== 'object' || reponse === null) return ''
  const valeur = (reponse as Record<string, unknown>).text
  return typeof valeur === 'string' ? valeur : ''
}

export function lireChoix(reponse: unknown): string | null {
  if (typeof reponse !== 'object' || reponse === null) return null
  const valeur = (reponse as Record<string, unknown>).choice
  return typeof valeur === 'string' ? valeur : null
}

export function lireChoixMultiples(reponse: unknown): string[] {
  if (typeof reponse !== 'object' || reponse === null) return []
  const valeur = (reponse as Record<string, unknown>).choices
  if (!Array.isArray(valeur)) return []
  return valeur.filter((v): v is string => typeof v === 'string')
}

export function lireOuiNon(reponse: unknown): boolean | null {
  if (typeof reponse !== 'object' || reponse === null) return null
  const valeur = (reponse as Record<string, unknown>).yes
  return typeof valeur === 'boolean' ? valeur : null
}

/** Ajoute ou retire une option d'une réponse à choix multiple. */
export function basculerChoix(reponse: unknown, optionId: string): Reponse {
  const actuels = lireChoixMultiples(reponse)
  return {
    choices: actuels.includes(optionId)
      ? actuels.filter((id) => id !== optionId)
      : [...actuels, optionId],
  }
}

/** Une réponse est-elle renseignée ? Sert à prévenir avant validation. */
export function reponseRenseignee(type: TypeQuestion, reponse: unknown): boolean {
  if (type === 'open') return lireTexte(reponse).trim().length > 0
  if (type === 'single_choice') return lireChoix(reponse) !== null
  if (type === 'multiple_choice') return lireChoixMultiples(reponse).length > 0
  return lireOuiNon(reponse) !== null
}

/** Questions obligatoires encore sans réponse, dans l'ordre d'affichage. */
export function questionsManquantes(
  questions: QuestionDiffusee[],
  brouillons: Record<string, unknown> | undefined,
): QuestionDiffusee[] {
  return questions.filter(
    (question) =>
      question.mandatory && !reponseRenseignee(question.type, brouillons?.[question.id]),
  )
}

/**
 * Description lisible d'une réponse, pour la notation et le RETEX.
 * Les choix sont rendus par leur libellé, jamais par leur identifiant.
 */
export function decrireReponse(
  type: TypeQuestion,
  contenu: unknown,
  options: OptionQuestion[] = [],
): string {
  const libelle = (id: string) => options.find((o) => o.id === id)?.label ?? id

  if (type === 'open') {
    const texte = lireTexte(contenu).trim()
    return texte.length > 0 ? texte : 'aucune réponse'
  }
  if (type === 'single_choice') {
    const choix = lireChoix(contenu)
    return choix === null ? 'aucune réponse' : libelle(choix)
  }
  if (type === 'multiple_choice') {
    const choix = lireChoixMultiples(contenu)
    return choix.length === 0 ? 'aucune réponse' : choix.map(libelle).join(' · ')
  }
  const oui = lireOuiNon(contenu)
  return oui === null ? 'aucune réponse' : oui ? 'oui' : 'non'
}

/**
 * Description de la réponse type saisie par l'animateur.
 *
 * Contrairement aux réponses d'équipe, `expected_answer` est du texte libre
 * (« a, b et d », « Isoler le réseau, alerter la DSI… ») : l'éditeur l'écrit
 * comme une chaîne JSON. On accepte aussi le format des réponses d'équipe, au
 * cas où une réponse type aurait été enregistrée sous cette forme.
 */
export function decrireReponseType(valeur: unknown, options: OptionQuestion[] = []): string {
  if (typeof valeur === 'string') {
    return valeur.trim().length > 0 ? valeur : 'aucune réponse type saisie'
  }
  if (typeof valeur !== 'object' || valeur === null) return 'aucune réponse type saisie'

  const objet = valeur as Record<string, unknown>
  if ('text' in objet) return decrireReponse('open', objet)
  if ('choice' in objet) return decrireReponse('single_choice', objet, options)
  if ('choices' in objet) return decrireReponse('multiple_choice', objet, options)
  if ('yes' in objet) return decrireReponse('yes_no', objet)
  return 'aucune réponse type saisie'
}
