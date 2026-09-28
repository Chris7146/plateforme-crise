import { libelleEvenement, type Evenement } from '../../lib/console'

/** Journal en direct : lecture seule de `events`, socle du RETEX. */
export function JournalDirect({
  journal,
  nomsEquipes,
}: {
  journal: Evenement[]
  nomsEquipes: Record<string, string>
}) {
  return (
    <section className="flex flex-col gap-2" aria-label="Journal de la session">
      <h2 className="text-xs text-secondaire">journal · alimente le RETEX</h2>
      {journal.length === 0 ? (
        <p className="text-xs text-secondaire">Aucun événement pour le moment.</p>
      ) : (
        <ul className="flex max-h-72 flex-col gap-1 overflow-y-auto text-xs">
          {journal.map((evenement) => (
            <li key={evenement.id} className="flex gap-2">
              <span className="shrink-0 text-secondaire/70">
                {new Date(evenement.created_at).toLocaleTimeString('fr-FR', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })}
              </span>
              <span className="shrink-0 text-vert">
                {evenement.team_id ? (nomsEquipes[evenement.team_id] ?? 'équipe') : 'Toutes'}
              </span>
              <span className="min-w-0 text-texte">{libelleEvenement(evenement)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
