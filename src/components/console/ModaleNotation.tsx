import { useState } from 'react'
import { Bouton, Champ, Erreur, Modale } from '../ui'
import { libelleTypeQuestion } from '../../lib/elements'
import { decrireReponse, decrireReponseType } from '../../lib/contenus'
import { noter, type Note, type Reponse, type Snapshot } from '../../lib/console'
import type { Equipe } from '../../lib/sessions'

/**
 * Notation d'une étape (lot 4) : réponse de l'équipe à côté de la réponse type
 * et du barème, puis saisie de la note de contenu. Le bonus de temps, lui, est
 * calculé automatiquement à la validation par `submit_answers()`.
 */
export function ModaleNotation({
  equipe,
  snapshot,
  reponses,
  notes,
  etapesCandidates,
  onFermer,
  onNote,
}: {
  equipe: Equipe
  snapshot: Snapshot | null
  reponses: Reponse[]
  notes: Note[]
  etapesCandidates: number[]
  onFermer: () => void
  onNote: () => void
}) {
  const [etape, setEtape] = useState(etapesCandidates[0] ?? equipe.current_step)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const noteExistante = notes.find((n) => n.team_id === equipe.id && n.step_index === etape)
  const [saisie, setSaisie] = useState(
    noteExistante?.content_score !== null && noteExistante?.content_score !== undefined
      ? String(noteExistante.content_score)
      : '',
  )

  const bareme = snapshot?.exercice.max_content_score ?? 8
  const questions = snapshot?.etapes[etape]?.questions ?? []
  const reponsesEtape = reponses.filter((r) => r.team_id === equipe.id && r.step_index === etape)

  async function enregistrer() {
    const valeur = Number(saisie.replace(',', '.'))
    if (!Number.isFinite(valeur) || valeur < 0 || valeur > bareme) {
      setErreur(`La note doit être comprise entre 0 et ${bareme}.`)
      return
    }
    setEnCours(true)
    setErreur(null)
    try {
      await noter(equipe.id, etape, valeur)
      onNote()
      onFermer()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Note non enregistrée.')
      setEnCours(false)
    }
  }

  return (
    <Modale titre={`Noter · ${equipe.name}`} onFermer={onFermer}>
      <div className="flex max-h-[75vh] flex-col gap-4 overflow-y-auto">
        {etapesCandidates.length > 1 ? (
          <div className="flex flex-wrap gap-2">
            {etapesCandidates.map((candidate) => (
              <Bouton
                key={candidate}
                variante={candidate === etape ? 'primaire' : 'secondaire'}
                onClick={() => {
                  setEtape(candidate)
                  const deja = notes.find(
                    (n) => n.team_id === equipe.id && n.step_index === candidate,
                  )
                  setSaisie(
                    deja?.content_score !== null && deja?.content_score !== undefined
                      ? String(deja.content_score)
                      : '',
                  )
                }}
              >
                étape {candidate + 1}
              </Bouton>
            ))}
          </div>
        ) : null}

        <p className="text-sm text-secondaire">
          Étape {etape + 1}
          {snapshot?.etapes[etape] ? ` · ${snapshot.etapes[etape].title}` : ''}
        </p>

        {questions.length === 0 ? (
          <p className="text-sm text-secondaire">Aucune question sur cette étape.</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {questions.map((question, index) => {
              const reponse = reponsesEtape.find((r) => r.question_id === question.id)
              return (
                <li key={question.id} className="flex flex-col gap-2">
                  <p className="text-xs text-secondaire">
                    question {index + 1} · {libelleTypeQuestion(question.type)}
                  </p>
                  <p className="text-sm text-texte">{question.prompt}</p>

                  <div className="rounded border border-bordure bg-fond p-2">
                    <p className="text-[11px] text-secondaire">réponse de l’équipe</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-texte">
                      {reponse
                        ? decrireReponse(question.type, reponse.content, question.options)
                        : 'aucune réponse transmise'}
                    </p>
                  </div>

                  <div className="rounded border border-vert/30 bg-vert/5 p-2">
                    <p className="text-[11px] text-vert">réponse type</p>
                    <p className="mt-1 whitespace-pre-line text-sm text-texte">
                      {decrireReponseType(question.expected_answer, question.options)}
                    </p>
                    {question.scoring_guide ? (
                      <p className="mt-2 border-t border-vert/20 pt-2 text-xs text-secondaire">
                        barème : {question.scoring_guide}
                      </p>
                    ) : null}
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        <div className="flex flex-wrap items-end justify-between gap-3 border-t border-bordure/60 pt-4">
          <Champ
            label={`Note de contenu (sur ${bareme})`}
            id="note-contenu"
            type="number"
            min={0}
            max={bareme}
            step="0.5"
            className="w-28"
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
          />
          <p className="text-xs text-secondaire">
            bonus de temps :{' '}
            {noteExistante?.time_bonus !== null && noteExistante?.time_bonus !== undefined
              ? `${noteExistante.time_bonus} / ${snapshot?.exercice.max_time_bonus ?? 2}`
              : 'calculé à la validation'}
          </p>
        </div>

        <Erreur>{erreur}</Erreur>
        <div className="flex justify-end gap-3">
          <Bouton variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton onClick={enregistrer} disabled={enCours || saisie.trim().length === 0}>
            {enCours ? 'enregistrement…' : 'Enregistrer la note'}
          </Bouton>
        </div>
      </div>
    </Modale>
  )
}
