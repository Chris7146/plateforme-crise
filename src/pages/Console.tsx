import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EnteteAnimateur } from '../components/EnteteAnimateur'
import { Bouton, Carte, Champ, Erreur, LienBouton } from '../components/ui'
import { CarteEquipe } from '../components/console/CarteEquipe'
import { JournalDirect } from '../components/console/JournalDirect'
import { ModaleDiffusion } from '../components/console/ModaleDiffusion'
import { ModaleMessage } from '../components/console/ModaleMessage'
import { ModaleNotation } from '../components/console/ModaleNotation'
import { useConsole } from '../hooks/useConsole'
import {
  ajouterTemps,
  arreter,
  enregistrerLienVisio,
  etapeSuivante,
  etapesANoter,
  journaliserVisio,
  marquerMessagesLus,
  medianeEtapes,
  messagesNonLus,
  mettreEnPause,
  reprendre,
  statutEquipe,
  terminer,
} from '../lib/console'
import { demarrerSession, libelleStatutSession } from '../lib/sessions'

type Panneau = 'contenu' | 'indice' | 'message' | 'notation' | null

/**
 * Console animateur (lot 4, maquette `console.html`).
 *
 * Toutes les interventions passent par les RPC, qui vérifient le rôle en base
 * et journalisent l'action. L'arrêt général est séparé des autres actions et
 * demande confirmation.
 */
export function Console() {
  const { id = '' } = useParams()
  const { etat, decalageMs, connexion, erreur, relire } = useConsole(id)
  const [selection, setSelection] = useState<string | null>(null)
  const [panneau, setPanneau] = useState<Panneau>(null)
  const [erreurAction, setErreurAction] = useState<string | null>(null)
  const [lienVisio, setLienVisio] = useState('')

  useEffect(() => {
    if (etat && selection === null && etat.equipes.length > 0) setSelection(etat.equipes[0].id)
  }, [etat, selection])

  useEffect(() => {
    if (etat?.session.call_url) setLienVisio(etat.session.call_url)
  }, [etat?.session.call_url])

  const mediane = useMemo(() => medianeEtapes(etat?.equipes ?? []), [etat?.equipes])

  if (erreur && !etat) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        <Erreur>{erreur}</Erreur>
        <div>
          <LienBouton to="/animateur/sessions">Retour aux sessions</LienBouton>
        </div>
      </div>
    )
  }

  if (!etat) return <p className="px-4 py-8 text-sm text-secondaire">Chargement…</p>

  const { session, equipes, snapshot, reponses, notes, messages, journal, connectes } = etat
  const equipe = equipes.find((e) => e.id === selection) ?? null
  const nbEtapes = snapshot?.etapes.length ?? 0
  const totalConnectes = Object.values(connectes).reduce((total, n) => total + n, 0)
  const totalANoter = equipes.reduce(
    (total, e) => total + etapesANoter(e.id, reponses, notes).length,
    0,
  )
  const nomsEquipes = Object.fromEntries(equipes.map((e) => [e.id, e.name]))

  async function agir(action: () => Promise<void>) {
    setErreurAction(null)
    try {
      await action()
    } catch (e) {
      setErreurAction(e instanceof Error ? e.message : 'Action impossible.')
    }
    await relire()
  }

  function confirmerPuis(question: string, action: () => Promise<void>) {
    if (window.confirm(question)) void agir(action)
  }

  async function ouvrirVisio() {
    if (!lienVisio.trim()) return
    await agir(async () => {
      if (lienVisio.trim() !== (session.call_url ?? '')) {
        await enregistrerLienVisio(id, lienVisio)
      }
      await journaliserVisio(id, equipe?.id)
      window.open(lienVisio.trim(), '_blank', 'noopener')
    })
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6">
      <EnteteAnimateur
        titre={session.title}
        sousTitre={
          <span className="flex flex-wrap items-center gap-3">
            <span>console animateur · {libelleStatutSession(session.status)}</span>
            <span>{totalConnectes} connectés</span>
            {totalANoter > 0 ? (
              <span className="text-ambre">
                {totalANoter} réponse{totalANoter > 1 ? 's' : ''} à noter
              </span>
            ) : null}
            <span className={connexion === 'connecte' ? 'text-vert' : 'text-rouge'}>
              {connexion === 'connecte' ? 'temps réel actif' : 'reconnexion…'}
            </span>
          </span>
        }
        actions={<LienBouton to={`/animateur/sessions/${id}`}>Préparation</LienBouton>}
      />

      <Erreur>{erreurAction ?? erreur}</Erreur>

      {/* Actions générales */}
      <Carte className="flex flex-wrap items-center gap-3">
        {session.status === 'draft' ? (
          <Bouton
            onClick={() =>
              confirmerPuis(
                'Démarrer la session ? Le contenu sera figé et toutes les équipes lanceront la première étape.',
                () => demarrerSession(id),
              )
            }
          >
            Démarrer
          </Bouton>
        ) : null}
        {session.status === 'running' ? (
          <Bouton variante="secondaire" onClick={() => void agir(() => mettreEnPause(id))}>
            Pause générale
          </Bouton>
        ) : null}
        {session.status === 'paused' ? (
          <Bouton onClick={() => void agir(() => reprendre(id))}>Reprendre</Bouton>
        ) : null}
        {session.status === 'running' || session.status === 'paused' ? (
          <Bouton
            variante="secondaire"
            onClick={() =>
              confirmerPuis('Terminer l’exercice pour toutes les équipes ?', () => terminer(id))
            }
          >
            Terminer
          </Bouton>
        ) : null}

        <div className="ml-auto">
          <Bouton
            variante="danger"
            onClick={() =>
              confirmerPuis(
                'ARRÊT GÉNÉRAL\n\nL’exercice s’interrompt immédiatement pour toutes les équipes. Confirmer ?',
                () => arreter(id),
              )
            }
            disabled={session.status === 'finished' || session.status === 'stopped'}
          >
            Arrêt général
          </Bouton>
        </div>
      </Carte>

      {/* Cartes d'équipe */}
      {equipes.length === 0 ? (
        <Carte>
          <p className="text-sm text-secondaire">
            Aucune équipe. Ajoutez-en depuis l’écran de préparation.
          </p>
        </Carte>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {equipes.map((membre) => (
            <CarteEquipe
              key={membre.id}
              equipe={membre}
              nbEtapes={Math.max(nbEtapes, membre.current_step + 1)}
              statut={statutEquipe(membre, {
                mediane,
                aReponseANoter: etapesANoter(membre.id, reponses, notes).length > 0,
              })}
              connectes={connectes[membre.id] ?? 0}
              messagesNonLus={messagesNonLus(membre.id, messages)}
              etapesANoter={etapesANoter(membre.id, reponses, notes)}
              selectionnee={membre.id === selection}
              decalageMs={decalageMs}
              onSelectionner={() => setSelection(membre.id)}
            />
          ))}
        </div>
      )}

      {/* Actions sur l'équipe sélectionnée */}
      {equipe ? (
        <Carte className="flex flex-col gap-3">
          <p className="text-xs text-secondaire">
            actions · <span className="text-vert">{equipe.name}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            <Bouton variante="secondaire" onClick={() => void agir(() => ajouterTemps(equipe.id, 120))}>
              + 2 min
            </Bouton>
            <Bouton variante="secondaire" onClick={() => void agir(() => ajouterTemps(equipe.id, -60))}>
              − 1 min
            </Bouton>
            <Bouton
              variante="secondaire"
              onClick={() =>
                confirmerPuis(`Faire passer ${equipe.name} à l’étape suivante ?`, () =>
                  etapeSuivante(equipe.id),
                )
              }
            >
              Étape suivante
            </Bouton>
            <Bouton variante="secondaire" onClick={() => setPanneau('contenu')}>
              Diffuser un contenu
            </Bouton>
            <Bouton variante="secondaire" onClick={() => setPanneau('indice')}>
              Envoyer un indice
            </Bouton>
            <Bouton
              variante="secondaire"
              onClick={() => {
                setPanneau('message')
                void agir(() => marquerMessagesLus(equipe.id))
              }}
            >
              Message
              {messagesNonLus(equipe.id, messages) > 0
                ? ` (${messagesNonLus(equipe.id, messages)})`
                : ''}
            </Bouton>
            <Bouton
              onClick={() => setPanneau('notation')}
              disabled={etapesANoter(equipe.id, reponses, notes).length === 0}
            >
              Noter
              {etapesANoter(equipe.id, reponses, notes).length > 0
                ? ` (${etapesANoter(equipe.id, reponses, notes).length})`
                : ''}
            </Bouton>
          </div>
        </Carte>
      ) : null}

      {/* Lien visio externe */}
      <Carte className="flex flex-wrap items-end gap-3">
        <Champ
          label="Lien visio externe (Teams, Meet, Jitsi)"
          id="lien-visio"
          type="url"
          placeholder="https://meet.exemple.fr/salle"
          className="min-w-[260px] flex-1"
          value={lienVisio}
          onChange={(e) => setLienVisio(e.target.value)}
        />
        <Bouton variante="secondaire" onClick={ouvrirVisio} disabled={!lienVisio.trim()}>
          Ouvrir l’appel
        </Bouton>
        <p className="w-full text-xs text-secondaire">
          L’appel se tient dans l’outil externe ; seule son ouverture est journalisée. Aucun
          enregistrement en V1.
        </p>
      </Carte>

      <Carte>
        <JournalDirect journal={journal} nomsEquipes={nomsEquipes} />
      </Carte>

      {equipe && panneau === 'contenu' ? (
        <ModaleDiffusion
          genre="content"
          sessionId={id}
          equipe={equipe}
          snapshot={snapshot}
          onFermer={() => setPanneau(null)}
          onDiffuse={() => void relire()}
        />
      ) : null}

      {equipe && panneau === 'indice' ? (
        <ModaleDiffusion
          genre="hint"
          sessionId={id}
          equipe={equipe}
          snapshot={snapshot}
          onFermer={() => setPanneau(null)}
          onDiffuse={() => void relire()}
        />
      ) : null}

      {equipe && panneau === 'message' ? (
        <ModaleMessage
          equipe={equipe}
          messages={messages}
          onFermer={() => setPanneau(null)}
          onEnvoye={() => void relire()}
        />
      ) : null}

      {equipe && panneau === 'notation' ? (
        <ModaleNotation
          equipe={equipe}
          snapshot={snapshot}
          reponses={reponses}
          notes={notes}
          etapesCandidates={etapesANoter(equipe.id, reponses, notes)}
          onFermer={() => setPanneau(null)}
          onNote={() => void relire()}
        />
      ) : null}
    </div>
  )
}
