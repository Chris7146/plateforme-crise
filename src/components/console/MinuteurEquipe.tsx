import { useEffect, useState } from 'react'
import { formatMMSS, niveauMinuteur, tempsRestantMs } from '../../lib/horloge'

/**
 * Minuteur d'une équipe sur sa carte de console.
 * L'échéance vient du serveur ; le battement ne sert qu'à l'affichage.
 */
export function MinuteurEquipe({
  echeance,
  resteFigeSecondes,
  decalageMs,
}: {
  echeance: string | null
  resteFigeSecondes: number | null
  decalageMs: number
}) {
  const [, forcerRendu] = useState(0)

  useEffect(() => {
    const battement = window.setInterval(() => forcerRendu((n) => n + 1), 500)
    return () => window.clearInterval(battement)
  }, [])

  if (resteFigeSecondes !== null) {
    return <span className="text-xl tabular-nums text-ambre">{formatMMSS(resteFigeSecondes * 1000)}</span>
  }
  if (!echeance) {
    return <span className="text-xl tabular-nums text-secondaire">--:--</span>
  }

  const restant = tempsRestantMs(new Date(echeance).getTime(), decalageMs)
  const couleurs = { nominal: 'text-texte', attention: 'text-ambre', urgence: 'text-rouge' }
  return (
    <span className={`text-xl tabular-nums ${couleurs[niveauMinuteur(restant)]}`}>
      {formatMMSS(restant)}
    </span>
  )
}
