import type { EtatConnexion } from '../../hooks/useVueEquipe'
import type { VueEquipe } from '../../lib/participant'

/** En-tête participant : exercice, équipe, appareils connectés, état du lien. */

const etatsConnexion: Record<EtatConnexion, { texte: string; point: string }> = {
  connexion: { texte: 'connexion…', point: 'bg-ambre animate-pulse' },
  connecte: { texte: 'connecté', point: 'bg-vert' },
  interrompu: { texte: 'reconnexion…', point: 'bg-rouge animate-pulse' },
}

export function EnteteEquipe({
  vue,
  connexion,
}: {
  vue: VueEquipe
  connexion: EtatConnexion
}) {
  const nombre = vue.participants.length
  const lien = etatsConnexion[connexion]

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-bordure pb-3">
      <div className="min-w-0">
        <p className="truncate text-xs text-secondaire">{vue.session.title}</p>
        <h1 className="truncate text-lg text-texte">{vue.team.name}</h1>
      </div>
      <div className="flex items-center gap-4 text-xs text-secondaire">
        <span className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${lien.point}`} aria-hidden="true" />
          <span role="status">{lien.texte}</span>
        </span>
        <span>
          {nombre} {nombre <= 1 ? 'connecté' : 'connectés'}
        </span>
      </div>
    </header>
  )
}
