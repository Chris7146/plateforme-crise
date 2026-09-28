import { useRef, useState } from 'react'
import { Bouton, Erreur } from '../ui'
import {
  estTropVolumineux,
  formaterTaille,
  televerserMedia,
  urlSigneeMedia,
} from '../../lib/medias'

/**
 * Sélection et téléversement d'un fichier dans le compartiment privé `media`.
 * Le fichier part dès qu'il est choisi ; seul son chemin est conservé en base.
 */
export function ChampMedia({
  label,
  exerciceId,
  chemin,
  accept,
  onChemin,
  onFichierChoisi,
}: {
  label: string
  exerciceId: string
  chemin: string | null
  accept?: string
  onChemin: (chemin: string | null) => void
  /** Permet de deviner le type de contenu depuis le fichier choisi. */
  onFichierChoisi?: (fichier: File) => void
}) {
  const champ = useRef<HTMLInputElement>(null)
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [avertissement, setAvertissement] = useState<string | null>(null)

  async function surSelection(fichier: File | undefined) {
    if (!fichier) return
    setErreur(null)
    setAvertissement(
      estTropVolumineux(fichier.size)
        ? `Fichier volumineux (${formaterTaille(fichier.size)}). Compressez-le avant l’exercice : ` +
            'le téléversement et la diffusion en salle seront plus lents.'
        : null,
    )
    onFichierChoisi?.(fichier)
    setEnCours(true)
    try {
      onChemin(await televerserMedia(exerciceId, fichier))
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Téléversement impossible.')
    } finally {
      setEnCours(false)
      if (champ.current) champ.current.value = ''
    }
  }

  async function previsualiser() {
    if (!chemin) return
    try {
      window.open(await urlSigneeMedia(chemin), '_blank', 'noopener')
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Prévisualisation impossible.')
    }
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="text-secondaire">{label}</span>
      {chemin ? (
        <div className="flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded border border-bordure bg-fond px-3 py-2 text-xs text-texte">
            {chemin.split('/').pop()}
          </code>
          <Bouton type="button" variante="secondaire" onClick={() => void previsualiser()}>
            Prévisualiser
          </Bouton>
          <Bouton type="button" variante="secondaire" onClick={() => onChemin(null)}>
            Retirer
          </Bouton>
        </div>
      ) : null}
      <input
        ref={champ}
        type="file"
        accept={accept}
        disabled={enCours}
        onChange={(e) => void surSelection(e.target.files?.[0])}
        className="min-h-[44px] rounded border border-bordure bg-fond px-3 py-2 text-xs text-secondaire file:mr-3 file:min-h-[32px] file:rounded file:border file:border-vert/50 file:bg-vert/15 file:px-3 file:text-vert"
      />
      {enCours ? <p className="text-xs text-secondaire">Téléversement en cours…</p> : null}
      {avertissement ? <p className="text-xs text-ambre">{avertissement}</p> : null}
      <Erreur>{erreur}</Erreur>
    </div>
  )
}
