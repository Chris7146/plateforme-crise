import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { EnteteAnimateur } from '../components/EnteteAnimateur'
import { ChampMedia } from '../components/editeur/ChampMedia'
import { SectionsEtape } from '../components/editeur/SectionsEtape'
import { Badge, Bouton, Champ, Erreur, LienBouton, Selecteur } from '../components/ui'
import {
  chargerExercice,
  resumerCharge,
  type Etape,
  type Exercice,
} from '../lib/exercices'
import {
  creerEtape,
  deplacer,
  DUREE_MAX_MINUTES,
  DUREE_MIN_MINUTES,
  estModifiee,
  majEtape,
  normaliserMinutes,
  reordonnerEtapes,
  secondesVersMinutes,
  supprimerEtape,
  type ChampsEtape,
  type ModeFinTemps,
} from '../lib/etapes'

/** Éditeur d'étapes d'un modèle ou d'une variante (lot 1, maquette `editeur-etapes.html`). */
export function EditeurExercice() {
  const { id = '' } = useParams()
  const [exercice, setExercice] = useState<Exercice | null>(null)
  const [etapes, setEtapes] = useState<Etape[]>([])
  const [selection, setSelection] = useState<string | null>(null)
  const [chargement, setChargement] = useState(true)
  const [erreur, setErreur] = useState<string | null>(null)
  const [brouillon, setBrouillon] = useState<ChampsEtape | null>(null)
  const [enregistrement, setEnregistrement] = useState(false)

  const recharger = useCallback(async () => {
    try {
      const donnees = await chargerExercice(id)
      if (!donnees) {
        setErreur('Exercice introuvable.')
        return
      }
      setExercice(donnees.exercice)
      setEtapes(donnees.etapes)
      setSelection((courante) =>
        courante && donnees.etapes.some((e) => e.id === courante)
          ? courante
          : (donnees.etapes[0]?.id ?? null),
      )
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

  const etapeSelectionnee = useMemo(
    () => etapes.find((e) => e.id === selection) ?? null,
    [etapes, selection],
  )

  // Le brouillon suit l'étape sélectionnée : on n'écrit en base qu'à l'enregistrement,
  // pour ne pas marquer « modifiée » une étape qu'on a seulement consultée.
  useEffect(() => {
    setBrouillon(
      etapeSelectionnee
        ? {
            title: etapeSelectionnee.title,
            duration_seconds: etapeSelectionnee.duration_seconds,
            end_of_time: etapeSelectionnee.end_of_time,
            advance_on_submit: etapeSelectionnee.advance_on_submit,
            ambient_audio_path: etapeSelectionnee.ambient_audio_path,
          }
        : null,
    )
  }, [etapeSelectionnee])

  const modificationsEnAttente = useMemo(() => {
    if (!etapeSelectionnee || !brouillon) return false
    return (
      brouillon.title !== etapeSelectionnee.title ||
      brouillon.duration_seconds !== etapeSelectionnee.duration_seconds ||
      brouillon.end_of_time !== etapeSelectionnee.end_of_time ||
      brouillon.advance_on_submit !== etapeSelectionnee.advance_on_submit ||
      brouillon.ambient_audio_path !== etapeSelectionnee.ambient_audio_path
    )
  }, [brouillon, etapeSelectionnee])

  function changerSelection(idEtape: string) {
    if (idEtape === selection) return
    if (
      modificationsEnAttente &&
      !window.confirm('Modifications non enregistrées sur cette étape. Les abandonner ?')
    ) {
      return
    }
    setSelection(idEtape)
  }

  async function agir(action: () => Promise<void>) {
    setErreur(null)
    try {
      await action()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Opération impossible.')
      await recharger()
    }
  }

  async function enregistrer() {
    if (!etapeSelectionnee || !brouillon) return
    setEnregistrement(true)
    await agir(async () => {
      const majee = await majEtape(etapeSelectionnee.id, brouillon)
      setEtapes((liste) => liste.map((e) => (e.id === majee.id ? majee : e)))
    })
    setEnregistrement(false)
  }

  async function ajouterEtape() {
    await agir(async () => {
      const nouvelle = await creerEtape(id, etapes.length)
      setEtapes((liste) => [...liste, nouvelle])
      setSelection(nouvelle.id)
    })
  }

  async function retirerEtape(etape: Etape) {
    if (
      !window.confirm(
        `Supprimer l’étape « ${etape.title} » ainsi que ses contenus, questions et indices ?`,
      )
    ) {
      return
    }
    await agir(async () => {
      await supprimerEtape(etape.id)
      const restantes = etapes.filter((e) => e.id !== etape.id)
      setEtapes(restantes)
      if (selection === etape.id) setSelection(restantes[0]?.id ?? null)
      await reordonnerEtapes(
        id,
        restantes.map((e) => e.id),
      )
    })
  }

  async function deplacerEtape(index: number, sens: -1 | 1) {
    const cible = index + sens
    if (cible < 0 || cible >= etapes.length) return
    const reordonnees = deplacer(etapes, index, cible)
    setEtapes(reordonnees) // affichage optimiste : le serveur reste la référence
    await agir(() =>
      reordonnerEtapes(
        id,
        reordonnees.map((e) => e.id),
      ),
    )
  }

  const nbEtapes = etapes.length
  const dureeTotale = etapes.reduce((total, e) => total + e.duration_seconds, 0)

  if (chargement) {
    return <p className="px-4 py-8 text-sm text-secondaire">Chargement…</p>
  }

  if (!exercice) {
    return (
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8">
        <Erreur>{erreur ?? 'Exercice introuvable.'}</Erreur>
        <div>
          <LienBouton to="/animateur/exercices">Retour à la bibliothèque</LienBouton>
        </div>
      </div>
    )
  }

  const estVariante = exercice.kind === 'variant'

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8">
      <EnteteAnimateur
        titre={exercice.title}
        sousTitre={
          <span className="flex items-center gap-2">
            {estVariante ? 'variante d’un modèle' : 'modèle · tronc commun'}
            <Badge ton={estVariante ? 'variante' : 'modele'}>
              {estVariante ? 'variante' : 'modèle'}
            </Badge>
            <span>{resumerCharge(nbEtapes, dureeTotale)}</span>
          </span>
        }
        actions={<LienBouton to="/animateur/exercices">Bibliothèque</LienBouton>}
      />

      <Erreur>{erreur}</Erreur>

      <div className="grid gap-4 md:grid-cols-[240px_minmax(0,1fr)]">
        <ListeEtapes
          etapes={etapes}
          selection={selection}
          onSelectionner={changerSelection}
          onDeplacer={deplacerEtape}
          onAjouter={ajouterEtape}
        />

        {etapeSelectionnee && brouillon ? (
          <PanneauEtape
            exerciceId={id}
            etape={etapeSelectionnee}
            index={etapes.findIndex((e) => e.id === etapeSelectionnee.id)}
            total={nbEtapes}
            brouillon={brouillon}
            onChanger={setBrouillon}
            modificationsEnAttente={modificationsEnAttente}
            enregistrement={enregistrement}
            onEnregistrer={enregistrer}
            onSupprimer={() => retirerEtape(etapeSelectionnee)}
          />
        ) : (
          <div className="rounded-lg border border-bordure bg-carte p-6 text-sm text-secondaire">
            Aucune étape pour le moment. Ajoutez la première étape pour commencer à composer
            l’exercice.
          </div>
        )}
      </div>
    </div>
  )
}

function ListeEtapes({
  etapes,
  selection,
  onSelectionner,
  onDeplacer,
  onAjouter,
}: {
  etapes: Etape[]
  selection: string | null
  onSelectionner: (id: string) => void
  onDeplacer: (index: number, sens: -1 | 1) => void
  onAjouter: () => void
}) {
  return (
    <nav
      aria-label="Étapes de l’exercice"
      className="flex flex-col gap-2 rounded-lg border border-bordure bg-carte p-3"
    >
      <p className="text-xs text-secondaire">étapes · flèches pour réordonner</p>
      <ul className="flex flex-col gap-2">
        {etapes.map((etape, index) => {
          const active = etape.id === selection
          return (
            <li
              key={etape.id}
              className={`flex items-center gap-1 rounded border px-2 py-1 ${
                active ? 'border-vert bg-vert/10' : 'border-bordure'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectionner(etape.id)}
                aria-current={active ? 'true' : undefined}
                className="min-h-[44px] min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm text-texte">
                  {index + 1}. {etape.title}
                </span>
                <span className="block text-xs text-secondaire">
                  {secondesVersMinutes(etape.duration_seconds)} min
                  {estModifiee(etape) ? <span className="text-bleu"> · modifiée</span> : null}
                </span>
              </button>
              <span className="flex shrink-0 flex-col">
                <button
                  type="button"
                  onClick={() => onDeplacer(index, -1)}
                  disabled={index === 0}
                  aria-label={`Déplacer « ${etape.title} » vers le haut`}
                  className="px-2 text-secondaire hover:text-texte disabled:opacity-30"
                >
                  ▲
                </button>
                <button
                  type="button"
                  onClick={() => onDeplacer(index, 1)}
                  disabled={index === etapes.length - 1}
                  aria-label={`Déplacer « ${etape.title} » vers le bas`}
                  className="px-2 text-secondaire hover:text-texte disabled:opacity-30"
                >
                  ▼
                </button>
              </span>
            </li>
          )
        })}
      </ul>
      <Bouton variante="secondaire" onClick={onAjouter}>
        + Ajouter une étape
      </Bouton>
      <p className="mt-2 flex flex-col gap-1 text-xs text-secondaire">
        <span className="flex items-center gap-2">
          <Badge ton="modele">modèle</Badge> hérité
        </span>
        <span className="flex items-center gap-2">
          <Badge ton="variante">variante</Badge> spécifique client
        </span>
      </p>
    </nav>
  )
}

function PanneauEtape({
  exerciceId,
  etape,
  index,
  total,
  brouillon,
  onChanger,
  modificationsEnAttente,
  enregistrement,
  onEnregistrer,
  onSupprimer,
}: {
  exerciceId: string
  etape: Etape
  index: number
  total: number
  brouillon: ChampsEtape
  onChanger: (champs: ChampsEtape) => void
  modificationsEnAttente: boolean
  enregistrement: boolean
  onEnregistrer: () => void
  onSupprimer: () => void
}) {
  const [minutes, setMinutes] = useState(String(secondesVersMinutes(brouillon.duration_seconds)))

  useEffect(() => {
    setMinutes(String(secondesVersMinutes(etape.duration_seconds)))
  }, [etape.id, etape.duration_seconds])

  function validerMinutes(saisie: string) {
    const normalisees = normaliserMinutes(saisie)
    if (normalisees === null) {
      setMinutes(String(secondesVersMinutes(brouillon.duration_seconds)))
      return
    }
    setMinutes(String(normalisees))
    onChanger({ ...brouillon, duration_seconds: normalisees * 60 })
  }

  return (
    <section className="flex flex-col gap-4 rounded-lg border border-bordure bg-carte p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-xs text-secondaire">
          étape {index + 1} / {total}
        </span>
        <div className="flex items-center gap-3">
          {estModifiee(etape) ? <Badge ton="variante">modifiée</Badge> : null}
          {modificationsEnAttente ? <Badge ton="attention">non enregistrée</Badge> : null}
          <Bouton onClick={onEnregistrer} disabled={!modificationsEnAttente || enregistrement}>
            {enregistrement ? 'Enregistrement…' : 'Enregistrer l’étape'}
          </Bouton>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_140px]">
        <Champ
          label="Titre de l’étape"
          id="titre-etape"
          maxLength={120}
          value={brouillon.title}
          onChange={(e) => onChanger({ ...brouillon, title: e.target.value })}
        />
        <Champ
          label={`Durée (${DUREE_MIN_MINUTES} à ${DUREE_MAX_MINUTES} min)`}
          id="duree-etape"
          type="number"
          min={DUREE_MIN_MINUTES}
          max={DUREE_MAX_MINUTES}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          onBlur={(e) => validerMinutes(e.target.value)}
        />
      </div>

      <Selecteur
        label="Fin du temps"
        id="fin-temps"
        value={brouillon.end_of_time}
        onChange={(e) =>
          onChanger({ ...brouillon, end_of_time: e.target.value as ModeFinTemps })
        }
      >
        <option value="auto">passage automatique à l’étape suivante</option>
        <option value="facilitator">attendre l’animateur</option>
      </Selecteur>

      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={brouillon.advance_on_submit}
          onChange={(e) => onChanger({ ...brouillon, advance_on_submit: e.target.checked })}
          className="mt-1 h-5 w-5 accent-[#3ecf8e]"
        />
        <span>
          Passer à l’étape suivante dès la validation de la réponse d’équipe
          <span className="block text-xs text-secondaire">
            Sans attendre la fin du temps imparti.
          </span>
        </span>
      </label>

      <div className="border-t border-bordure/60 pt-4">
        <ChampMedia
          label="Ambiance sonore de l’étape (facultative)"
          exerciceId={exerciceId}
          chemin={brouillon.ambient_audio_path}
          accept="audio/*"
          onChemin={(chemin) => onChanger({ ...brouillon, ambient_audio_path: chemin })}
        />
        <p className="mt-1 text-xs text-secondaire">
          Jouée en boucle côté participants, après le déverrouillage de l’audio par le clic
          « Commencer ».
        </p>
      </div>

      <div className="border-t border-bordure/60 pt-4">
        <SectionsEtape exerciceId={exerciceId} etape={etape} />
      </div>

      <div className="flex justify-end border-t border-bordure/60 pt-4">
        <Bouton variante="danger" onClick={onSupprimer}>
          Supprimer l’étape
        </Bouton>
      </div>
    </section>
  )
}
