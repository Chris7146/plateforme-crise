import { MinuteurEquipe } from './MinuteurEquipe'
import { libelleStatutEquipe, tonStatutEquipe, type StatutEquipe } from '../../lib/console'
import type { Equipe } from '../../lib/sessions'

const tons = {
  vert: 'border-vert/50 bg-vert/10 text-vert',
  ambre: 'border-ambre/50 bg-ambre/10 text-ambre',
  rouge: 'border-rouge/50 bg-rouge/10 text-rouge',
  bleu: 'border-bleu/50 bg-bleu/10 text-bleu',
  neutre: 'border-bordure bg-carte text-secondaire',
} as const

/** Carte d'équipe : avancement, minuteur, statut et ce qui demande attention. */
export function CarteEquipe({
  equipe,
  statut,
  nbEtapes,
  connectes,
  messagesNonLus,
  etapesANoter,
  selectionnee,
  decalageMs,
  onSelectionner,
}: {
  equipe: Equipe
  statut: StatutEquipe
  nbEtapes: number
  connectes: number
  messagesNonLus: number
  etapesANoter: number[]
  selectionnee: boolean
  decalageMs: number
  onSelectionner: () => void
}) {
  const informations = [
    `${connectes} ${connectes <= 1 ? 'connecté' : 'connectés'}`,
    messagesNonLus > 0
      ? `${messagesNonLus} message${messagesNonLus > 1 ? 's' : ''} non lu${messagesNonLus > 1 ? 's' : ''}`
      : null,
    etapesANoter.length > 0
      ? `${etapesANoter.length} réponse${etapesANoter.length > 1 ? 's' : ''} à noter`
      : null,
  ].filter(Boolean)

  return (
    <button
      type="button"
      onClick={onSelectionner}
      aria-pressed={selectionnee}
      className={`flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors ${
        selectionnee ? 'border-vert bg-vert/5' : 'border-bordure bg-carte hover:border-vert/40'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm text-texte">{equipe.name}</span>
        <span
          className={`shrink-0 rounded border px-2 py-0.5 text-[11px] ${tons[tonStatutEquipe(statut)]}`}
        >
          {libelleStatutEquipe(statut)}
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-secondaire">
          étape {Math.min(equipe.current_step + 1, Math.max(nbEtapes, 1))} / {nbEtapes}
        </span>
        <MinuteurEquipe
          echeance={equipe.step_deadline}
          resteFigeSecondes={equipe.remaining_on_pause_seconds}
          decalageMs={decalageMs}
        />
      </div>
      <p className="text-[11px] text-secondaire">{informations.join(' · ')}</p>
    </button>
  )
}
