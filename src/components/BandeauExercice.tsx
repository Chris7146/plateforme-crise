/**
 * Bandeau « exercice » permanent, garde-fou imposé sur TOUS les écrans
 * (participants et console). Voir CLAUDE.md et spécification §7.
 */
export function BandeauExercice() {
  return (
    <div
      role="status"
      className="sticky top-0 z-50 border-b border-ambre/40 bg-ambre/10 px-4 py-1.5 text-center text-xs uppercase tracking-widest text-ambre"
    >
      Exercice · simulation · aucune situation réelle
    </div>
  )
}
