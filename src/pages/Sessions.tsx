import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EnteteAnimateur } from '../components/EnteteAnimateur'
import { Badge, Bouton, Carte, Champ, Erreur, LienBouton, Modale, Selecteur } from '../components/ui'
import {
  chargerExercices,
  resumerCharge,
  type ResumeExercice,
} from '../lib/exercices'
import {
  chargerSessions,
  creerSession,
  libelleStatutSession,
  tonStatutSession,
  type ResumeSession,
} from '../lib/sessions'

/** Liste des sessions et création d'une session à partir d'un exercice (lot 2). */
export function Sessions() {
  const [sessions, setSessions] = useState<ResumeSession[] | null>(null)
  const [exercices, setExercices] = useState<ResumeExercice[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [creation, setCreation] = useState(false)

  const recharger = useCallback(async () => {
    try {
      const [listeSessions, listeExercices] = await Promise.all([
        chargerSessions(),
        chargerExercices(),
      ])
      setSessions(listeSessions)
      setExercices(listeExercices)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible.')
    }
  }, [])

  useEffect(() => {
    void recharger()
  }, [recharger])

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <EnteteAnimateur
        titre="Sessions"
        sousTitre="exercices joués en salle"
        actions={
          <>
            <LienBouton to="/animateur/exercices">Bibliothèque</LienBouton>
            <Bouton onClick={() => setCreation(true)}>Nouvelle session</Bouton>
          </>
        }
      />

      <Erreur>{erreur}</Erreur>

      {sessions === null ? (
        <p className="text-sm text-secondaire">Chargement…</p>
      ) : sessions.length === 0 ? (
        <Carte className="flex flex-col gap-3">
          <p className="text-texte">Aucune session pour le moment.</p>
          <p className="text-sm text-secondaire">
            Une session est une partie jouée : elle part d’un exercice, reçoit des équipes, puis
            fige son contenu au démarrage. L’exercice peut évoluer ensuite sans rien changer aux
            sessions déjà lancées.
          </p>
          <div>
            <Bouton onClick={() => setCreation(true)}>Créer la première session</Bouton>
          </div>
        </Carte>
      ) : (
        <ul className="flex flex-col gap-3">
          {sessions.map(({ session, titreExercice, nbEquipes }) => (
            <li key={session.id}>
              <Carte className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-texte">{session.title}</span>
                    <Badge ton={tonStatutSession(session.status)}>
                      {libelleStatutSession(session.status)}
                    </Badge>
                  </div>
                  <p className="text-xs text-secondaire">
                    {titreExercice ?? 'exercice supprimé'} ·{' '}
                    {nbEquipes === 0
                      ? 'aucune équipe'
                      : nbEquipes === 1
                        ? '1 équipe'
                        : `${nbEquipes} équipes`}
                  </p>
                </div>
                <LienBouton to={`/animateur/sessions/${session.id}`} className="shrink-0">
                  Ouvrir
                </LienBouton>
              </Carte>
            </li>
          ))}
        </ul>
      )}

      {creation ? (
        <ModaleSession
          exercices={exercices}
          onFermer={() => setCreation(false)}
          onCree={recharger}
        />
      ) : null}
    </div>
  )
}

function ModaleSession({
  exercices,
  onFermer,
  onCree,
}: {
  exercices: ResumeExercice[]
  onFermer: () => void
  onCree: () => Promise<void>
}) {
  const navigate = useNavigate()
  // Les variantes sont le cas courant (un exercice préparé pour un client) ;
  // un modèle reste jouable tel quel, notamment pour un essai à blanc.
  const jouables = [
    ...exercices.filter((e) => e.exercice.kind === 'variant'),
    ...exercices.filter((e) => e.exercice.kind === 'template'),
  ].filter((e) => e.nbEtapes > 0)

  const [exerciceId, setExerciceId] = useState(jouables[0]?.exercice.id ?? '')
  const [titre, setTitre] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const choisi = jouables.find((e) => e.exercice.id === exerciceId)
  const titreFinal = titre.trim() || (choisi ? `${choisi.exercice.title} — ${dateDuJour()}` : '')

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setEnCours(true)
    try {
      const id = await creerSession(exerciceId, titreFinal)
      await onCree()
      navigate(`/animateur/sessions/${id}`)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Création impossible.')
      setEnCours(false)
    }
  }

  return (
    <Modale titre="Nouvelle session" onFermer={onFermer}>
      {jouables.length === 0 ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-secondaire">
            Aucun exercice jouable : il faut au moins un modèle ou une variante comportant une
            étape.
          </p>
          <div className="flex justify-end gap-3">
            <Bouton variante="secondaire" onClick={onFermer}>
              Fermer
            </Bouton>
            <LienBouton to="/animateur/exercices" variante="primaire">
              Aller à la bibliothèque
            </LienBouton>
          </div>
        </div>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={soumettre}>
          <Selecteur
            label="Exercice joué"
            id="exercice-session"
            value={exerciceId}
            onChange={(e) => setExerciceId(e.target.value)}
          >
            {jouables.map(({ exercice, nomClient, nbEtapes, dureeSecondes }) => (
              <option key={exercice.id} value={exercice.id}>
                {exercice.kind === 'variant' ? 'variante' : 'modèle'} · {exercice.title}
                {nomClient ? ` (${nomClient})` : ''} · {resumerCharge(nbEtapes, dureeSecondes)}
              </option>
            ))}
          </Selecteur>

          <Champ
            label="Titre de la session (par défaut : exercice et date du jour)"
            id="titre-session"
            maxLength={120}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
          />

          <p className="text-xs text-secondaire">
            Le contenu sera figé au démarrage : les modifications apportées ensuite à l’exercice
            n’affecteront pas cette session.
          </p>

          <Erreur>{erreur}</Erreur>
          <div className="flex justify-end gap-3">
            <Bouton type="button" variante="secondaire" onClick={onFermer}>
              Annuler
            </Bouton>
            <Bouton type="submit" disabled={enCours || titreFinal.length === 0}>
              {enCours ? 'Création…' : 'Créer la session'}
            </Bouton>
          </div>
        </form>
      )}
    </Modale>
  )
}

function dateDuJour(): string {
  return new Date().toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
