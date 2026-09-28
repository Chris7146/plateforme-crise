import { useEffect, useState } from 'react'
import { formatMMSS, niveauMinuteur } from '../../lib/horloge'
import { etatParticipant, tempsRestantAffiche } from '../../lib/etatParticipant'
import type { VueEquipe } from '../../lib/participant'

/**
 * Minuteur de l'étape (lot 3). Le `setInterval` ne sert qu'à rafraîchir
 * l'affichage : la source de vérité reste l'échéance serveur `step_deadline`.
 * Vert nominal, ambre sous 2 min, rouge sous 1 min.
 */

const couleurs = {
  nominal: 'text-vert',
  attention: 'text-ambre',
  urgence: 'text-rouge',
} as const

export function Minuteur({ vue, decalageMs }: { vue: VueEquipe; decalageMs: number }) {
  const [, forcerRendu] = useState(0)

  useEffect(() => {
    const battement = window.setInterval(() => forcerRendu((n) => n + 1), 250)
    return () => window.clearInterval(battement)
  }, [])

  const restant = tempsRestantAffiche(vue, decalageMs)
  const etat = etatParticipant(vue)

  if (restant === null) {
    return (
      <div className="text-right">
        <p className="text-xs text-secondaire">temps restant</p>
        <p className="text-3xl leading-tight text-secondaire">--:--</p>
      </div>
    )
  }

  const enPause = etat === 'pause'
  const couleur = enPause ? 'text-ambre' : couleurs[niveauMinuteur(restant)]

  return (
    <div className="text-right">
      <p className="text-xs text-secondaire">
        {enPause ? 'temps figé' : etat === 'temps_ecoule' ? 'temps écoulé' : 'temps restant'}
      </p>
      <p
        className={`text-4xl leading-tight tabular-nums ${couleur}`}
        role="timer"
        aria-live="off"
        aria-label={`Temps restant : ${formatMMSS(restant)}`}
      >
        {formatMMSS(restant)}
      </p>
    </div>
  )
}
