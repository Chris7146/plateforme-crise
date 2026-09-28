import { useState } from 'react'
import { Bouton, Erreur, Modale } from '../ui'
import { libelleTypeContenu } from '../../lib/elements'
import { diffuser, itemsManuels, type Snapshot } from '../../lib/console'
import type { Equipe } from '../../lib/sessions'

/**
 * Diffusion manuelle d'un contenu ou envoi d'un indice (RPC `release_item`).
 * Cible : l'équipe sélectionnée ou toutes les équipes de la session.
 */
export function ModaleDiffusion({
  genre,
  sessionId,
  equipe,
  snapshot,
  onFermer,
  onDiffuse,
}: {
  genre: 'content' | 'hint'
  sessionId: string
  equipe: Equipe
  snapshot: Snapshot | null
  onFermer: () => void
  onDiffuse: () => void
}) {
  const { contenus, indices } = itemsManuels(snapshot, equipe.current_step)
  const [toutesLesEquipes, setToutesLesEquipes] = useState(false)
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState<string | null>(null)

  async function envoyer(itemId: string) {
    setEnCours(itemId)
    setErreur(null)
    try {
      await diffuser(sessionId, genre, itemId, toutesLesEquipes ? null : [equipe.id])
      onDiffuse()
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Diffusion impossible.')
    } finally {
      setEnCours(null)
    }
  }

  const liste =
    genre === 'content'
      ? contenus.map((c) => ({
          id: c.id,
          principal: c.title,
          secondaire: libelleTypeContenu(c.type),
        }))
      : indices.map((h) => ({
          id: h.id,
          principal: h.body,
          secondaire: h.trigger_mode === 'auto' ? `auto · T+${Math.round(h.trigger_offset_seconds / 60)} min` : 'manuel',
        }))

  return (
    <Modale
      titre={genre === 'content' ? 'Diffuser un contenu' : 'Envoyer un indice'}
      onFermer={onFermer}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-secondaire">
          Étape {equipe.current_step + 1} de <span className="text-texte">{equipe.name}</span>.
          {genre === 'content'
            ? ' Seuls les contenus à déclenchement manuel figurent ici.'
            : ' Les indices peuvent être envoyés à tout moment.'}
        </p>

        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={toutesLesEquipes}
            onChange={(e) => setToutesLesEquipes(e.target.checked)}
            className="h-5 w-5 accent-[#3ecf8e]"
          />
          Envoyer à toutes les équipes de la session
        </label>

        {liste.length === 0 ? (
          <p className="text-sm text-secondaire">
            {genre === 'content'
              ? 'Aucun contenu manuel pour cette étape.'
              : 'Aucun indice prévu pour cette étape.'}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-bordure/60">
            {liste.map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0">
                  <span className="block text-sm text-texte">{item.principal}</span>
                  <span className="block text-xs text-secondaire">{item.secondaire}</span>
                </span>
                <Bouton onClick={() => void envoyer(item.id)} disabled={enCours !== null}>
                  {enCours === item.id ? 'envoi…' : 'Envoyer'}
                </Bouton>
              </li>
            ))}
          </ul>
        )}

        <Erreur>{erreur}</Erreur>
        <div className="flex justify-end">
          <Bouton variante="secondaire" onClick={onFermer}>
            Fermer
          </Bouton>
        </div>
      </div>
    </Modale>
  )
}
