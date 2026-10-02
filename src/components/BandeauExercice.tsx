/**
 * Bandeau « exercice » permanent, garde-fou imposé sur TOUS les écrans
 * (participants et console). Voir CLAUDE.md et spécification §7.
 *
 * Hauteur fixe (h-7) : le bandeau d'indices des écrans étroits se cale juste
 * en dessous (`sticky top-7`) sans jamais recouvrir ce garde-fou.
 */
export function BandeauExercice() {
  return (
    <div
      role="status"
      className="sticky top-0 z-50 flex h-7 items-center justify-center border-b border-ambre/40 bg-ambre/10 px-4 text-center text-xs uppercase tracking-widest text-ambre"
    >
      Exercice · simulation · aucune situation réelle
    </div>
  )
}
