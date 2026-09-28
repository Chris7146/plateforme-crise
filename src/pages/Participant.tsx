import { useNavigate, useParams } from 'react-router-dom'
import { Bouton, Carte, Erreur } from '../components/ui'
import { AmbianceSonore } from '../components/participant/AmbianceSonore'
import { BarreProgression } from '../components/participant/BarreProgression'
import { ContenusDiffuses } from '../components/participant/ContenusDiffuses'
import { EnteteEquipe } from '../components/participant/EnteteEquipe'
import { Indices } from '../components/participant/Indices'
import { Messagerie } from '../components/participant/Messagerie'
import { Minuteur } from '../components/participant/Minuteur'
import { Questions } from '../components/participant/Questions'
import { useVueEquipe } from '../hooks/useVueEquipe'
import { etatParticipant, libelleEtape, libelleEtat } from '../lib/etatParticipant'
import { oublierEquipe } from '../lib/participant'

/**
 * Écran participant (lot 3, maquette `participant.html`).
 *
 * L'état vient entièrement de `get_team_view()`, relu à chaque signal temps
 * réel. Aucun passage d'étape n'est décidé ici : le minuteur n'est qu'un
 * affichage du temps restant jusqu'à l'échéance fixée par le serveur.
 */
export function Participant() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { vue, decalageMs, connexion, erreur, relire } = useVueEquipe(id)

  function retourAccueil() {
    oublierEquipe()
    navigate('/', { replace: true })
  }

  if (erreur && !vue) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 px-4 py-12">
        <Erreur>{erreur}</Erreur>
        <p className="text-sm text-secondaire">
          Cette équipe n’est peut-être plus accessible depuis cet appareil. Revenez à l’accueil
          pour saisir à nouveau votre code.
        </p>
        <div>
          <Bouton onClick={retourAccueil}>Retour à l’accueil</Bouton>
        </div>
      </div>
    )
  }

  if (!vue) return <p className="px-4 py-12 text-center text-sm text-secondaire">Chargement…</p>

  const etat = etatParticipant(vue)
  const enJeu = etat === 'en_cours' || etat === 'temps_ecoule'
  const acheve = etat === 'fin' || etat === 'arret'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <EnteteEquipe vue={vue} connexion={connexion} />

      {enJeu || etat === 'pause' ? (
        <div className="flex items-center justify-between gap-4 border-b border-bordure pb-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-secondaire">{libelleEtape(vue)}</p>
            <div className="mt-2">
              <BarreProgression
                indexCourant={vue.team.current_step}
                nombre={vue.team.step_count}
              />
            </div>
          </div>
          <Minuteur vue={vue} decalageMs={decalageMs} />
        </div>
      ) : null}

      <Erreur>{erreur}</Erreur>

      {etat === 'attente' ? (
        <Carte className="flex flex-col gap-2">
          <p className="text-texte">En attente du démarrage par l’animateur.</p>
          <p className="text-sm text-secondaire">
            Gardez cet écran ouvert : il basculera tout seul au lancement de l’exercice.
          </p>
        </Carte>
      ) : null}

      {etat === 'pause' ? (
        <Carte className="flex flex-col gap-2 border-ambre/40">
          <p className="text-ambre" role="status">
            {libelleEtat('pause')}
          </p>
          <p className="text-sm text-secondaire">
            Le temps est figé. L’exercice reprendra à la main de l’animateur.
          </p>
        </Carte>
      ) : null}

      {etat === 'temps_ecoule' ? (
        <Carte className="flex flex-col gap-2 border-ambre/40">
          <p className="text-ambre" role="status">
            {libelleEtat('temps_ecoule')}
          </p>
          <p className="text-sm text-secondaire">
            Vous pouvez encore valider votre réponse si ce n’est pas déjà fait.
          </p>
        </Carte>
      ) : null}

      {acheve ? (
        <Carte className="flex flex-col gap-2">
          <p className="text-texte">
            {etat === 'arret'
              ? 'L’exercice a été interrompu par l’animateur.'
              : 'L’exercice est terminé.'}
          </p>
          <p className="text-sm text-secondaire">
            Merci de votre participation. L’animateur vous présentera le retour d’expérience.
          </p>
        </Carte>
      ) : null}

      {enJeu ? (
        <>
          <AmbianceSonore chemin={vue.step?.ambient_audio_path ?? null} />
          <ContenusDiffuses contenus={vue.step?.contents} />
          <Indices indices={vue.step?.hints ?? []} />
          <Questions vue={vue} equipeId={id} onApresAction={() => void relire()} />
        </>
      ) : null}

      {!acheve ? (
        <Messagerie vue={vue} equipeId={id} onApresAction={() => void relire()} />
      ) : null}

      {etat === 'attente' ? (
        <Carte className="flex flex-col gap-3">
          <h2 className="text-sm text-secondaire">
            Participants connectés ({vue.participants.length})
          </h2>
          <ul className="flex flex-wrap gap-2">
            {vue.participants.map((participant, index) => (
              <li
                key={`${participant.name}-${index}`}
                className="rounded border border-bordure bg-fond px-3 py-1 text-sm text-texte"
              >
                {participant.name}
              </li>
            ))}
          </ul>
        </Carte>
      ) : null}

      <div className="flex justify-end">
        <Bouton
          variante="secondaire"
          onClick={() => {
            if (window.confirm('Quitter cet exercice sur cet appareil ?')) retourAccueil()
          }}
        >
          Quitter sur cet appareil
        </Bouton>
      </div>
    </div>
  )
}
