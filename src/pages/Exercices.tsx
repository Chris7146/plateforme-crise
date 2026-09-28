import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EnteteAnimateur } from '../components/EnteteAnimateur'
import {
  Badge,
  Bouton,
  Carte,
  Champ,
  Erreur,
  LienBouton,
  Modale,
  Selecteur,
  ZoneTexte,
} from '../components/ui'
import {
  chargerExercices,
  creerClient,
  creerModele,
  creerVariante,
  listerClients,
  regrouperParModele,
  resumerCharge,
  type Client,
  type ListeGroupee,
  type ResumeExercice,
} from '../lib/exercices'

/** Listes des modèles et de leurs variantes, création de l'un et de l'autre (lot 1). */
export function Exercices() {
  const [liste, setListe] = useState<ListeGroupee | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [erreur, setErreur] = useState<string | null>(null)
  const [modale, setModale] = useState<'modele' | ResumeExercice | null>(null)

  const recharger = useCallback(async () => {
    try {
      const [resumes, listeClients] = await Promise.all([chargerExercices(), listerClients()])
      setListe(regrouperParModele(resumes))
      setClients(listeClients)
      setErreur(null)
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Chargement impossible.')
    }
  }, [])

  useEffect(() => {
    void recharger()
  }, [recharger])

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8">
      <EnteteAnimateur
        titre="Modèles et variantes"
        sousTitre="bibliothèque d’exercices"
        actions={
          <>
            <LienBouton to="/animateur/sessions">Sessions</LienBouton>
            <Bouton onClick={() => setModale('modele')}>Nouveau modèle</Bouton>
          </>
        }
      />

      <Erreur>{erreur}</Erreur>

      {liste === null ? (
        <p className="text-sm text-secondaire">Chargement…</p>
      ) : liste.groupes.length === 0 && liste.orphelines.length === 0 ? (
        <Carte className="flex flex-col gap-3">
          <p className="text-texte">Aucun modèle pour le moment.</p>
          <p className="text-sm text-secondaire">
            Un modèle porte le tronc commun d’un exercice : ses étapes, contenus, questions et
            indices. Il se décline ensuite en variantes par client, chaque variante étant une copie
            indépendante.
          </p>
          <div>
            <Bouton onClick={() => setModale('modele')}>Créer le premier modèle</Bouton>
          </div>
        </Carte>
      ) : (
        <div className="flex flex-col gap-4">
          {liste.groupes.map(({ modele, variantes }) => (
            <Carte key={modele.exercice.id} className="flex flex-col gap-3">
              <LigneExercice resume={modele} ton="modele" />
              <div className="flex flex-wrap gap-3">
                <Bouton variante="secondaire" onClick={() => setModale(modele)}>
                  Créer une variante
                </Bouton>
              </div>
              {variantes.length > 0 ? (
                <ul className="flex flex-col divide-y divide-bordure/60 border-t border-bordure/60">
                  {variantes.map((variante) => (
                    <li key={variante.exercice.id} className="pt-3">
                      <LigneExercice resume={variante} ton="variante" />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="border-t border-bordure/60 pt-3 text-xs text-secondaire">
                  Aucune variante pour ce modèle.
                </p>
              )}
            </Carte>
          ))}

          {liste.orphelines.length > 0 ? (
            <Carte className="flex flex-col gap-3">
              <h2 className="text-sm text-ambre">Variantes sans modèle d’origine</h2>
              <p className="text-xs text-secondaire">
                Le modèle dont elles proviennent a été supprimé. Elles restent utilisables : une
                variante est indépendante de son modèle dès sa création.
              </p>
              <ul className="flex flex-col divide-y divide-bordure/60 border-t border-bordure/60">
                {liste.orphelines.map((variante) => (
                  <li key={variante.exercice.id} className="pt-3">
                    <LigneExercice resume={variante} ton="variante" />
                  </li>
                ))}
              </ul>
            </Carte>
          ) : null}
        </div>
      )}

      {modale === 'modele' ? (
        <ModaleModele onFermer={() => setModale(null)} onCree={recharger} />
      ) : modale !== null ? (
        <ModaleVariante
          modele={modale}
          clients={clients}
          onFermer={() => setModale(null)}
          onCree={recharger}
        />
      ) : null}
    </div>
  )
}

function LigneExercice({ resume, ton }: { resume: ResumeExercice; ton: 'modele' | 'variante' }) {
  const { exercice, nomClient, nbEtapes, dureeSecondes } = resume
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-texte">{exercice.title}</span>
          <Badge ton={ton}>{ton === 'modele' ? 'modèle' : 'variante'}</Badge>
        </div>
        <p className="text-xs text-secondaire">
          {resumerCharge(nbEtapes, dureeSecondes)}
          {nomClient ? ` · ${nomClient}` : ''}
        </p>
      </div>
      <LienBouton to={`/animateur/exercices/${exercice.id}`} className="shrink-0">
        Ouvrir l’éditeur
      </LienBouton>
    </div>
  )
}

function ModaleModele({
  onFermer,
  onCree,
}: {
  onFermer: () => void
  onCree: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [titre, setTitre] = useState('')
  const [description, setDescription] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setEnCours(true)
    try {
      const id = await creerModele(titre, description)
      await onCree()
      navigate(`/animateur/exercices/${id}`)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Création impossible.')
      setEnCours(false)
    }
  }

  return (
    <Modale titre="Nouveau modèle" onFermer={onFermer}>
      <form className="flex flex-col gap-4" onSubmit={soumettre}>
        <Champ
          label="Titre du modèle"
          id="titre-modele"
          required
          maxLength={120}
          placeholder="cyberattaque établissement de santé"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />
        <ZoneTexte
          label="Description (facultative)"
          id="description-modele"
          rows={3}
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <Erreur>{erreur}</Erreur>
        <div className="flex justify-end gap-3">
          <Bouton type="button" variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enCours || titre.trim().length === 0}>
            {enCours ? 'Création…' : 'Créer le modèle'}
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}

function ModaleVariante({
  modele,
  clients,
  onFermer,
  onCree,
}: {
  modele: ResumeExercice
  clients: Client[]
  onFermer: () => void
  onCree: () => Promise<void>
}) {
  const navigate = useNavigate()
  const [clientId, setClientId] = useState(clients[0]?.id ?? '')
  const [nouveauClient, setNouveauClient] = useState('')
  const [titre, setTitre] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  const creationClient = clientId === '' || clientId === 'nouveau'
  const titreFinal = titre.trim() || nouveauClient.trim() || clients.find((c) => c.id === clientId)?.name || ''

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setEnCours(true)
    try {
      const client = creationClient ? await creerClient(nouveauClient) : { id: clientId }
      const id = await creerVariante(modele.exercice.id, client.id, titreFinal)
      await onCree()
      navigate(`/animateur/exercices/${id}`)
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Création impossible.')
      setEnCours(false)
    }
  }

  return (
    <Modale titre="Nouvelle variante" onFermer={onFermer}>
      <form className="flex flex-col gap-4" onSubmit={soumettre}>
        <p className="text-sm text-secondaire">
          Copie indépendante de <span className="text-texte">{modele.exercice.title}</span> :{' '}
          {resumerCharge(modele.nbEtapes, modele.dureeSecondes)}. Les modifications ultérieures du
          modèle ne s’y propageront pas.
        </p>

        <Selecteur
          label="Client"
          id="client-variante"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
        >
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
          <option value="nouveau">+ nouveau client…</option>
        </Selecteur>

        {creationClient ? (
          <Champ
            label="Nom du nouveau client"
            id="nouveau-client"
            required
            maxLength={120}
            placeholder="CHU de Valmont"
            value={nouveauClient}
            onChange={(e) => setNouveauClient(e.target.value)}
          />
        ) : null}

        <Champ
          label="Titre de la variante (par défaut : le nom du client)"
          id="titre-variante"
          maxLength={120}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
        />

        <Erreur>{erreur}</Erreur>
        <div className="flex justify-end gap-3">
          <Bouton type="button" variante="secondaire" onClick={onFermer}>
            Annuler
          </Bouton>
          <Bouton type="submit" disabled={enCours || titreFinal.length === 0}>
            {enCours ? 'Copie…' : 'Créer la variante'}
          </Bouton>
        </div>
      </form>
    </Modale>
  )
}
