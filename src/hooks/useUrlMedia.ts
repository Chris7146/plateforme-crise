import { useEffect, useState } from 'react'
import { urlSigneeMedia } from '../lib/medias'

/**
 * URL signée temporaire d'un média du compartiment privé.
 * Le compartiment n'est jamais public : côté participant, la règle
 * `media_participant_read` n'autorise que les médias effectivement diffusés.
 */
export function useUrlMedia(chemin: string | null): { url: string | null; erreur: boolean } {
  const [url, setUrl] = useState<string | null>(null)
  const [erreur, setErreur] = useState(false)

  useEffect(() => {
    if (!chemin) {
      setUrl(null)
      setErreur(false)
      return
    }
    let actif = true
    setErreur(false)
    urlSigneeMedia(chemin)
      .then((signee) => {
        if (actif) setUrl(signee)
      })
      .catch(() => {
        if (actif) setErreur(true)
      })
    return () => {
      actif = false
    }
  }, [chemin])

  return { url, erreur }
}
