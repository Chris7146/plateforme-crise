import { useEffect, useRef, useState } from 'react'
import { Erreur } from '../ui'
import {
  estOuvert,
  heureReception,
  indicesTries,
  libelleCompteur,
  nombreNonOuverts,
  suivreIndices,
  type SuiviIndices,
} from '../../lib/indices'
import { jouerSignalIndice, reglerSon, sonActif } from '../../lib/sonAlerte'
import { ouvrirIndice, type Indice } from '../../lib/participant'

/**
 * Panneau « Indices » (évolution du lot 3, après le test du 2 octobre 2026).
 *
 * Colonne dédiée à droite sur grand écran, bandeau + tiroir sur tablette en
 * portrait et sur téléphone. Un indice arrive avec un halo, un badge et un
 * signal sonore ; son texte n'est révélé qu'à l'ouverture, qui est journalisée
 * côté serveur (RPC `open_hint`) pour le RETEX.
 *
 * Indices automatiques (T+) et manuels suivent le même chemin : la vue
 * d'équipe ne les distingue pas, ce composant non plus.
 */

/** Durée du halo d'arrivée ; le badge « Nouveau », lui, reste jusqu'à l'ouverture. */
const DUREE_HALO_MS = 6000

function IconeIndice({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden="true"
      className={`h-4 w-4 shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8 1.6a4.4 4.4 0 0 0-2.6 7.9c.4.3.6.8.6 1.3v.3h4v-.3c0-.5.2-1 .6-1.3A4.4 4.4 0 0 0 8 1.6Z" />
      <path d="M6.3 13h3.4M7 14.6h2" />
    </svg>
  )
}

function EncadreIndice({
  indice,
  ouvert,
  texte,
  halo,
  enCours,
  replie,
  onOuvrir,
}: {
  indice: Indice
  ouvert: boolean
  texte: string | null
  halo: boolean
  enCours: boolean
  replie: boolean
  onOuvrir: () => void
}) {
  const heure = heureReception(indice)

  // Reçu, pas encore ouvert : couleur distincte, badge et halo. Le halo est
  // supprimé si le participant a demandé moins d'animations (motion-safe).
  if (!ouvert) {
    return (
      <div
        className={`rounded-lg border border-ambre/50 bg-[#1c1506] p-3 ${
          halo ? 'motion-safe:animate-pulse motion-safe:ring-2 motion-safe:ring-ambre/50' : ''
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs text-ambre">
            <IconeIndice />
            Nouvel indice reçu
          </span>
          {heure ? <span className="text-xs text-secondaire">{heure}</span> : null}
        </div>
        <span className="mt-1 inline-block rounded border border-ambre/60 bg-ambre/20 px-1.5 py-0.5 text-[11px] uppercase tracking-wide text-ambre">
          Nouveau
        </span>
        <button
          type="button"
          onClick={onOuvrir}
          disabled={enCours}
          className="mt-2 flex min-h-[44px] w-full items-center justify-center rounded border border-ambre/50 bg-ambre/10 px-3 text-sm text-ambre transition-colors hover:bg-ambre/20 disabled:opacity-50"
        >
          {enCours ? 'Ouverture…' : 'Ouvrir l’indice'}
        </button>
      </div>
    )
  }

  const corps = (
    <p className="text-sm leading-relaxed text-[#e8d6ad]">{texte ?? indice.body}</p>
  )

  // Indice déjà ouvert : relisible à volonté, sans nouvel enregistrement.
  // Les plus anciens sont repliés pour laisser la place au dernier reçu.
  if (replie) {
    return (
      <details className="rounded-lg border border-bordure bg-carte p-3">
        <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-2 text-xs text-secondaire">
          <span className="flex items-center gap-1.5">
            <IconeIndice />
            indice ouvert
          </span>
          {heure ? <span>{heure}</span> : null}
        </summary>
        <div className="mt-2">{corps}</div>
      </details>
    )
  }

  return (
    <div className="rounded-lg border border-ambre/40 bg-ambre/5 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-xs text-ambre">
          <IconeIndice />
          indice
        </span>
        {heure ? <span className="text-xs text-secondaire">{heure}</span> : null}
      </div>
      <div className="mt-1">{corps}</div>
    </div>
  )
}

export function PanneauIndices({
  indices,
  equipeId,
  onApresAction,
}: {
  indices: Indice[]
  equipeId: string
  onApresAction?: () => void
}) {
  const suivi = useRef<SuiviIndices | null>(null)
  const [halos, setHalos] = useState<string[]>([])
  const [annonce, setAnnonce] = useState('')
  const [tiroir, setTiroir] = useState(false)
  const [son, setSon] = useState(sonActif)
  const [textes, setTextes] = useState<Record<string, string>>({})
  const [enCours, setEnCours] = useState<string | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)

  // Signal d'arrivée. `suivreIndices` n'annonce rien à la première lecture :
  // ni le chargement initial, ni une reconnexion, ni une relecture périodique
  // ne déclenchent donc le son — seul un indice réellement nouveau le fait.
  useEffect(() => {
    const suivant = suivreIndices(suivi.current, indices)
    suivi.current = suivant
    if (!suivant.annonce) return
    jouerSignalIndice()
    setHalos(suivant.arrivees)
    setAnnonce(
      `${suivant.arrivees.length > 1 ? 'Nouveaux indices reçus' : 'Nouvel indice reçu'} · ${libelleCompteur(indices.length)}`,
    )
  }, [indices])

  // Extinction du halo dans un effet séparé : l'effet d'arrivée se rejoue à
  // chaque relecture (toutes les 30 s au moins) et annulerait son propre
  // minuteur, laissant le halo pulser indéfiniment.
  useEffect(() => {
    if (halos.length === 0) return
    const minuteur = window.setTimeout(() => setHalos([]), DUREE_HALO_MS)
    return () => window.clearTimeout(minuteur)
  }, [halos])

  const ouvertsLocalement = new Set(Object.keys(textes))

  async function ouvrir(indice: Indice) {
    if (estOuvert(indice, ouvertsLocalement) || enCours) return
    setEnCours(indice.id)
    setErreur(null)
    try {
      const complet = await ouvrirIndice(equipeId, indice.id)
      if (complet.body) {
        setTextes((actuels) => ({ ...actuels, [indice.id]: complet.body as string }))
      }
      setHalos((actuels) => actuels.filter((id) => id !== indice.id))
      onApresAction?.()
    } catch {
      setErreur('Indice indisponible pour l’instant. Réessayez.')
    } finally {
      setEnCours(null)
    }
  }

  function basculerSon() {
    const suivant = !son
    reglerSon(suivant)
    setSon(suivant)
  }

  const tries = indicesTries(indices)
  const nonOuverts = nombreNonOuverts(indices, ouvertsLocalement)

  const contenu = (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-1.5 text-sm text-ambre">
          <IconeIndice />
          Indices
        </h2>
        <span className="text-xs text-secondaire">{libelleCompteur(indices.length)}</span>
      </div>

      <Erreur>{erreur}</Erreur>

      {tries.length === 0 ? (
        <p className="text-xs text-secondaire">Aucun indice pour le moment.</p>
      ) : (
        tries.map((indice, rang) => (
          <EncadreIndice
            key={indice.id}
            indice={indice}
            ouvert={estOuvert(indice, ouvertsLocalement)}
            texte={textes[indice.id] ?? null}
            halo={halos.includes(indice.id)}
            enCours={enCours === indice.id}
            replie={rang > 0}
            onOuvrir={() => void ouvrir(indice)}
          />
        ))
      )}

      <button
        type="button"
        onClick={basculerSon}
        className="mt-1 min-h-[44px] rounded border border-bordure px-3 text-xs text-secondaire transition-colors hover:bg-carte"
      >
        {son ? 'couper le son d’alerte' : 'réactiver le son d’alerte'}
      </button>
    </div>
  )

  return (
    <>
      {/* Écran étroit : bandeau fixe sous le bandeau « exercice » (h-7), tiroir au toucher. */}
      {indices.length > 0 ? (
        <div className="sticky top-7 z-40 -mx-4 lg:hidden">
          <button
            type="button"
            onClick={() => setTiroir((ouvert) => !ouvert)}
            aria-expanded={tiroir}
            aria-controls="tiroir-indices"
            className="flex min-h-[44px] w-full items-center justify-between gap-2 border-b border-ambre/40 bg-[#1c1506] px-4 text-sm text-ambre"
          >
            <span className="flex items-center gap-2">
              <IconeIndice />
              {nonOuverts > 0 ? 'Nouvel indice' : 'Indices reçus'}
            </span>
            <span className="flex items-center gap-2">
              {nonOuverts > 0 ? (
                <span
                  className="rounded-full bg-ambre px-2 py-0.5 text-xs font-bold text-fond"
                  aria-label={`${nonOuverts} non ouvert${nonOuverts > 1 ? 's' : ''}`}
                >
                  {nonOuverts}
                </span>
              ) : null}
              <span className="text-xs text-ambre/70">{tiroir ? 'fermer' : 'ouvrir'}</span>
            </span>
          </button>
          {tiroir ? (
            <div
              id="tiroir-indices"
              className="max-h-[60vh] overflow-y-auto border-b border-bordure bg-carte px-4 py-3"
            >
              {contenu}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Grand écran : colonne dédiée à droite, toujours visible. */}
      <aside
        aria-label="Indices"
        className="hidden w-80 shrink-0 rounded-lg border border-bordure bg-carte/60 p-3 lg:sticky lg:top-10 lg:order-2 lg:block"
      >
        {contenu}
      </aside>

      <p aria-live="polite" className="sr-only">
        {annonce}
      </p>
    </>
  )
}
