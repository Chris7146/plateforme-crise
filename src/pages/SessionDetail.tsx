import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EnteteAnimateur } from '../components/EnteteAnimateur'
import { QrCode } from '../components/QrCode'
import { Badge, Bouton, Carte, Champ, Erreur, LienBouton } from '../components/ui'
import { resumerCharge } from '../lib/exercices'
import {
  chargerSession,
  creerEquipes,
  demarrerSession,
  estModifiable,
  libelleStatutSession,
  nomsEquipesParDefaut,
  raisonDemarrageImpossible,
  renommerEquipe,
  supprimerEquipe,
  tonStatutSession,
  urlRejoindre,
  type DetailSession,
} from '../lib/sessions'

/** Préparation d'une session : équipes, codes d'accès, démarrage (lot 2). */
export function SessionDetail() {
  const { id = '' } = useParams()
  const [detail, setDetail] = useState<DetailSession | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [nombre, setNombre] = useState('3')

  const recharger = useCallback(async () => {
    try {
      const donnees = await chargerSession(id)
      if (!donnees) {
        setErreur('Session introuvable.')
        return
      }
      setDetail(donnees)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible.')
    } finally {
      setChargement(false)
    }
  }, [id])

  useEffect(() => {
    void recharger()
  }, [recharger])

  async function agir(action: () => Promise<void>) {
    setErreur(null)
    try {
      await action()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Opération impossible.')
    }
    await recharger()
  }

  if (chargement) return <p className="px-4 py-8 text-sm text-secondaire">Chargement…</p>

  if (!detail) {
    return (
      <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-8">
        <Erreur>{erreur ?? 'Session introuvable.'}</Erreur>
        <div>
          <LienBouton to="/animateur/sessions">Retour aux sessions</LienBouton>
        </div>
      </div>
    )
  }

  const { session, exercice, equipes, nbEtapes, dureeSecondes } = detail
  const modifiable = estModifiable(session.status)
  const blocage = raisonDemarrageImpossible(session, equipes, nbEtapes)

  async function ajouterEquipes() {
    const combien = Number.parseInt(nombre, 10)
    if (!Number.isFinite(combien) || combien < 1) return
    await agir(() => creerEquipes(id, nomsEquipesParDefaut(combien, equipes.length)).then(() => {}))
  }

  async function demarrer() {
    if (
      !window.confirm(
        `Démarrer « ${session.title} » ?\n\nLe contenu sera figé et les ${equipes.length} équipes ` +
          'lanceront la première étape immédiatement.',
      )
    ) {
      return
    }
    await agir(() => demarrerSession(id))
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6 px-4 py-8">
      <EnteteAnimateur
        titre={session.title}
        sousTitre={
          <span className="flex flex-wrap items-center gap-2">
            <Badge ton={tonStatutSession(session.status)}>
              {libelleStatutSession(session.status)}
            </Badge>
            <span>
              {exercice.title} · {resumerCharge(nbEtapes, dureeSecondes)}
            </span>
          </span>
        }
        actions={<LienBouton to="/animateur/sessions">Sessions</LienBouton>}
      />

      <Erreur>{erreur}</Erreur>

      <Carte className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-sm text-secondaire">Démarrage</h2>
          <p className="text-xs text-secondaire">
            {blocage ??
              'Le contenu sera figé et toutes les équipes lanceront la première étape.'}
          </p>
        </div>
        <div className="flex gap-3">
          {equipes.length > 0 ? (
            <LienBouton to={`/animateur/sessions/${id}/codes`}>Codes à projeter</LienBouton>
          ) : null}
          <Bouton onClick={demarrer} disabled={blocage !== null}>
            Démarrer la session
          </Bouton>
        </div>
      </Carte>

      <Carte className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm text-secondaire">
            Équipes {equipes.length > 0 ? `(${equipes.length})` : ''}
          </h2>
          {modifiable ? (
            <div className="flex items-end gap-2">
              <Champ
                label="Ajouter"
                id="nombre-equipes"
                type="number"
                min={1}
                max={20}
                className="w-20"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
              <Bouton variante="secondaire" onClick={ajouterEquipes}>
                + Équipes
              </Bouton>
            </div>
          ) : (
            <span className="text-xs text-secondaire">
              Session démarrée : la composition des équipes n’est plus modifiable.
            </span>
          )}
        </div>

        {equipes.length === 0 ? (
          <p className="text-sm text-secondaire">
            Aucune équipe. Chaque équipe reçoit un code d’accès que ses participants saisissent
            depuis leurs appareils.
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-bordure/60">
            {equipes.map((equipe) => (
              <li key={equipe.id} className="flex flex-wrap items-center gap-4 py-3">
                <QrCode valeur={urlRejoindre(equipe.join_code, window.location.origin)} taille={72} />
                <div className="min-w-0 flex-1">
                  {modifiable ? (
                    <Champ
                      label={`Nom de l’équipe`}
                      id={`nom-${equipe.id}`}
                      defaultValue={equipe.name}
                      maxLength={60}
                      onBlur={(e) => {
                        if (e.target.value.trim() && e.target.value !== equipe.name) {
                          void agir(() => renommerEquipe(equipe.id, e.target.value))
                        }
                      }}
                    />
                  ) : (
                    <p className="text-texte">{equipe.name}</p>
                  )}
                </div>
                <code className="rounded border border-vert/40 bg-vert/10 px-3 py-2 text-lg tracking-[0.3em] text-vert">
                  {equipe.join_code}
                </code>
                {modifiable ? (
                  <Bouton
                    variante="danger"
                    onClick={() => {
                      if (window.confirm(`Supprimer « ${equipe.name} » ?`)) {
                        void agir(() => supprimerEquipe(equipe.id))
                      }
                    }}
                  >
                    Supprimer
                  </Bouton>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Carte>
    </div>
  )
}
