import { progressionEtapes } from '../../lib/etatParticipant'

/**
 * Barre de progression par segments (voir maquette `participant.html`).
 * Les étapes à venir restent neutres : leur contenu n'est jamais transmis.
 */

const styles = {
  terminee: 'bg-vert',
  courante: 'bg-ambre',
  a_venir: 'bg-bordure',
} as const

export function BarreProgression({
  indexCourant,
  nombre,
}: {
  indexCourant: number
  nombre: number
}) {
  const segments = progressionEtapes(indexCourant, nombre)
  if (segments.length === 0) return null

  return (
    <div
      className="flex gap-1"
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={nombre}
      aria-valuenow={indexCourant + 1}
      aria-label={`Étape ${indexCourant + 1} sur ${nombre}`}
    >
      {segments.map((etat, index) => (
        <span key={index} className={`h-1.5 flex-1 rounded-sm ${styles[etat]}`} />
      ))}
    </div>
  )
}
