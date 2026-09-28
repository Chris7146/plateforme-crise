import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Bouton, Carte, Erreur } from '../components/ui'
import {
  chargerVueEquipe,
  exerciceEnCours,
  oublierEquipe,
  type VueEquipe,
} from '../lib/participant'

/**
 * Écran participant — salle d'attente (lot 2).
 * L'interface de jeu complète (contenus, minuteur, questions) arrive au lot 3.
 *
 * L'état est TOUJOURS relu en entier via `get_team_view()` : jamais reconstruit
 * à partir de messages reçus. La relecture a lieu au chargement, à intervalle
 * régulier et au retour de veille de l'appareil.
 */
export function Participant() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const [vue, setVue] = useState<VueEquipe | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  const relire = useCallback(async () => {
    try {
      setVue(await chargerVueEquipe(id))
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'État indisponible.')
    }
  }, [id])

  useEffect(() => {
    void relire()
    const minuterie = window.setInterval(() => void relire(), 5000)
    const surReveil = () => {
      if (document.visibilityState === 'visible') void relire()
    }
    document.addEventListener('visibilitychange', surReveil)
    window.addEventListener('online', surReveil)
    return () => {
      window.clearInterval(minuterie)
      document.removeEventListener('visibilitychange', surReveil)
      window.removeEventListener('online', surReveil)
    }
  }, [relire])

  function quitter() {
    if (!window.confirm('Quitter cet exercice sur cet appareil ?')) return
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
          <Bouton
            onClick={() => {
              oublierEquipe()
              navigate('/', { replace: true })
            }}
          >
            Retour à l’accueil
          </Bouton>
        </div>
      </div>
    )
  }

  if (!vue) return <p className="px-4 py-12 text-center text-sm text-secondaire">Chargement…</p>

  const enCours = exerciceEnCours(vue)
  const termine = vue.team.status === 'finished' || vue.session.status === 'stopped'

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-secondaire">{vue.session.title}</p>
          <h1 className="text-xl text-vert">{vue.team.name}</h1>
        </div>
        <Badge ton={enCours ? 'variante' : termine ? 'attention' : 'neutre'}>
          {termine ? 'exercice terminé' : enCours ? 'exercice en cours' : 'en attente'}
        </Badge>
      </header>

      <Erreur>{erreur}</Erreur>

      {termine ? (
        <Carte className="flex flex-col gap-2">
          <p className="text-texte">L’exercice est terminé.</p>
          <p className="text-sm text-secondaire">
            Merci de votre participation. L’animateur vous présentera le retour d’expérience.
          </p>
        </Carte>
      ) : enCours ? (
        <Carte className="flex flex-col gap-2">
          <p className="text-texte">
            L’exercice a commencé — étape {vue.team.current_step + 1} sur {vue.team.step_count}.
          </p>
          <p className="text-sm text-secondaire">
            L’écran de jeu (contenus, minuteur et questions) arrive au lot 3.
          </p>
        </Carte>
      ) : (
        <Carte className="flex flex-col gap-2">
          <p className="text-texte">En attente du démarrage par l’animateur.</p>
          <p className="text-sm text-secondaire">
            Gardez cet écran ouvert : il basculera tout seul au lancement de l’exercice.
          </p>
        </Carte>
      )}

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
        <p className="text-xs text-secondaire">
          Chaque appareil de l’équipe apparaît ici. Vous pouvez travailler à plusieurs : les
          réponses sont partagées.
        </p>
      </Carte>

      <div className="flex justify-end">
        <Bouton variante="secondaire" onClick={quitter}>
          Quitter sur cet appareil
        </Bouton>
      </div>
    </div>
  )
}
