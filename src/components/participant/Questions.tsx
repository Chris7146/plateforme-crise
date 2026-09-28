import { useEffect, useRef, useState } from 'react'
import { Bouton, Erreur } from '../ui'
import {
  basculerChoix,
  lireChoix,
  lireChoixMultiples,
  lireOuiNon,
  lireQuestions,
  lireTexte,
  questionsManquantes,
  type QuestionDiffusee,
} from '../../lib/contenus'
import { libelleTypeQuestion } from '../../lib/elements'
import { saisiePossible, validationPossible } from '../../lib/etatParticipant'
import { enregistrerBrouillon, validerReponses, type VueEquipe } from '../../lib/participant'

/**
 * Questions de l'étape, avec brouillon partagé entre les appareils de l'équipe
 * (lot 3). Le brouillon part en base après une courte pause de frappe
 * (anti-rebond) ; les appareils voisins le reçoivent par Realtime.
 * Une seule validation par équipe et par étape.
 */

/** Pause de frappe avant envoi du brouillon : assez court pour suivre, assez long pour ne pas saturer. */
const ANTI_REBOND_MS = 400

export function Questions({
  vue,
  equipeId,
  onApresAction,
}: {
  vue: VueEquipe
  equipeId: string
  onApresAction: () => void
}) {
  const questions = lireQuestions(vue.step?.questions)
  const [erreur, setErreur] = useState<string | null>(null)
  const [validation, setValidation] = useState(false)

  if (questions.length === 0) return null

  const modifiable = saisiePossible(vue)
  const peutValider = validationPossible(vue)
  const manquantes = questionsManquantes(questions, vue.drafts)

  async function valider() {
    if (manquantes.length > 0) {
      setErreur(
        `Réponse obligatoire manquante : « ${manquantes[0].prompt} »` +
          (manquantes.length > 1 ? ` (et ${manquantes.length - 1} autre(s))` : ''),
      )
      return
    }
    if (
      !window.confirm(
        'Valider la réponse de l’équipe pour cette étape ?\n\n' +
          'Une seule validation est possible : elle ne pourra plus être modifiée.',
      )
    ) {
      return
    }
    setValidation(true)
    setErreur(null)
    try {
      await validerReponses(equipeId)
      onApresAction()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Validation impossible.')
    } finally {
      setValidation(false)
    }
  }

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-bordure bg-carte p-4"
      aria-label="Questions de l’étape"
    >
      {questions.map((question, index) => (
        <Question
          key={question.id}
          question={question}
          numero={index + 1}
          valeur={vue.drafts?.[question.id]}
          modifiable={modifiable}
          equipeId={equipeId}
          onErreur={setErreur}
        />
      ))}

      <Erreur>{erreur}</Erreur>

      {vue.submitted ? (
        <p className="rounded border border-vert/40 bg-vert/10 p-3 text-sm text-vert" role="status">
          Réponse transmise. En attente de l’étape suivante.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bordure/60 pt-3">
          <p className="text-xs text-secondaire">
            brouillon partagé entre les appareils de l’équipe
          </p>
          <Bouton onClick={valider} disabled={!peutValider || validation}>
            {validation ? 'validation…' : 'valider la réponse d’équipe'}
          </Bouton>
        </div>
      )}
    </section>
  )
}

function Question({
  question,
  numero,
  valeur,
  modifiable,
  equipeId,
  onErreur,
}: {
  question: QuestionDiffusee
  numero: number
  valeur: unknown
  modifiable: boolean
  equipeId: string
  onErreur: (message: string | null) => void
}) {
  async function enregistrer(contenu: unknown) {
    try {
      await enregistrerBrouillon(equipeId, question.id, contenu)
      onErreur(null)
    } catch (e) {
      onErreur(e instanceof Error ? e.message : 'Brouillon non enregistré.')
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-secondaire">
        question {numero} · {libelleTypeQuestion(question.type)}
        {question.mandatory ? ' · obligatoire' : ' · facultative'}
      </p>
      <p className="text-sm text-texte">{question.prompt}</p>

      {question.type === 'open' ? (
        <ReponseOuverte
          valeur={valeur}
          modifiable={modifiable}
          identifiant={question.id}
          onEnregistrer={enregistrer}
        />
      ) : question.type === 'yes_no' ? (
        <div className="flex gap-2">
          {[
            { cle: true, libelle: 'oui' },
            { cle: false, libelle: 'non' },
          ].map(({ cle, libelle }) => (
            <Choix
              key={libelle}
              coche={lireOuiNon(valeur) === cle}
              modifiable={modifiable}
              onClick={() => void enregistrer({ yes: cle })}
            >
              {libelle}
            </Choix>
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {question.options.map((option) => {
            const coche =
              question.type === 'single_choice'
                ? lireChoix(valeur) === option.id
                : lireChoixMultiples(valeur).includes(option.id)
            return (
              <Choix
                key={option.id}
                coche={coche}
                modifiable={modifiable}
                onClick={() =>
                  void enregistrer(
                    question.type === 'single_choice'
                      ? { choice: option.id }
                      : basculerChoix(valeur, option.id),
                  )
                }
              >
                {option.label}
              </Choix>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Choix({
  coche,
  modifiable,
  onClick,
  children,
}: {
  coche: boolean
  modifiable: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!modifiable}
      aria-pressed={coche}
      className={`flex min-h-[44px] items-center gap-2 rounded border px-3 py-2 text-left text-sm transition-colors disabled:opacity-60 ${
        coche ? 'border-vert bg-vert/10 text-vert' : 'border-bordure text-texte hover:bg-fond'
      }`}
    >
      <span aria-hidden="true">{coche ? '▣' : '▢'}</span>
      {children}
    </button>
  )
}

/**
 * Champ de réponse ouverte, partagé entre les appareils.
 *
 * Pendant la frappe, la valeur locale a la priorité : une relecture ne vient
 * pas écraser le texte en cours de saisie. Hors frappe, le texte des autres
 * appareils est appliqué directement — seule exception admise au principe
 * « signal puis relecture » (voir CLAUDE.md).
 */
function ReponseOuverte({
  valeur,
  modifiable,
  identifiant,
  onEnregistrer,
}: {
  valeur: unknown
  modifiable: boolean
  identifiant: string
  onEnregistrer: (contenu: unknown) => Promise<void>
}) {
  const distant = lireTexte(valeur)
  const [texte, setTexte] = useState(distant)
  const enFrappe = useRef(false)
  const attente = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (!enFrappe.current) setTexte(distant)
  }, [distant])

  useEffect(() => () => window.clearTimeout(attente.current), [])

  function surSaisie(nouveau: string) {
    enFrappe.current = true
    setTexte(nouveau)
    window.clearTimeout(attente.current)
    attente.current = window.setTimeout(() => {
      void onEnregistrer({ text: nouveau })
    }, ANTI_REBOND_MS)
  }

  return (
    <textarea
      id={`reponse-${identifiant}`}
      rows={4}
      value={texte}
      disabled={!modifiable}
      onChange={(e) => surSaisie(e.target.value)}
      onBlur={() => {
        enFrappe.current = false
        window.clearTimeout(attente.current)
        if (texte !== distant) void onEnregistrer({ text: texte })
      }}
      placeholder={modifiable ? 'Réponse de l’équipe…' : ''}
      className="rounded border border-bordure bg-fond px-3 py-2 text-sm leading-relaxed text-texte placeholder:text-secondaire/60 focus:border-bleu focus:outline-none disabled:opacity-60"
    />
  )
}
