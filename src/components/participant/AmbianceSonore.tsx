import { useEffect, useRef, useState } from 'react'
import { useUrlMedia } from '../../hooks/useUrlMedia'
import { Bouton } from '../ui'

/**
 * Son d'ambiance de l'étape, joué en boucle.
 *
 * Les navigateurs interdisent la lecture automatique sans geste de
 * l'utilisateur : le clic « commencer la simulation » suffit, mais après un
 * rechargement il faut un nouveau geste, d'où le bouton de réactivation.
 */
export function AmbianceSonore({ chemin }: { chemin: string | null }) {
  const { url } = useUrlMedia(chemin)
  const lecteur = useRef<HTMLAudioElement>(null)
  const [bloque, setBloque] = useState(false)

  useEffect(() => {
    const element = lecteur.current
    if (!url || !element) return
    element.volume = 0.5
    element
      .play()
      .then(() => setBloque(false))
      .catch(() => setBloque(true))
  }, [url])

  if (!chemin) return null

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-ambre">
      <audio ref={lecteur} src={url ?? undefined} loop />
      <span>ambiance sonore {bloque ? 'en attente' : 'en cours'}</span>
      {bloque ? (
        <Bouton
          variante="secondaire"
          onClick={() => {
            lecteur.current
              ?.play()
              .then(() => setBloque(false))
              .catch(() => setBloque(true))
          }}
        >
          Réactiver le son
        </Bouton>
      ) : null}
    </div>
  )
}
