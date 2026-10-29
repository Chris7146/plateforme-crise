import { useState } from 'react'
import { Badge, Bouton, Erreur, Modale } from '../ui'
import { libelleTypeContenu } from '../../lib/elements'
import {
  diffuser,
  indiceDejaDiffuse,
  itemsDiffusables,
  libelleDeclenchementIndice,
  type Snapshot,
} from '../../lib/console'
import type { Equipe } from '../../lib/sessions'
import { messageErreur } from '../../lib/erreurs'

/**
 * Diffusion manuelle d'un contenu ou envoi d'un indice (RPC `release_item`).
 * Cible : l'équipe sélectionnée ou toutes les équipes de la session.
 *
 * Les indices automatiques figurent dans la liste : les envoyer avant leur T+
 * les diffuse immédiatement (correctif du 29 octobre 2026). Un indice déjà
 * parvenu à l'équipe sélectionnée — par envoi ou par le temps — est signalé et
 * son bouton désactivé ; l'envoi à toutes les équipes reste possible.
 */
export function ModaleDiffusion({
  genre,
  sessionId,
  equipe,
  snapshot,
  pausedAt,
  diffuses,
  onFermer,
  onDiffuse,
}: {
  genre: 'content' | 'hint'
  sessionId: string
  equipe: Equipe
  snapshot: Snapshot | null
  pausedAt: string | null
  diffuses: string[]
  onFermer: () => void
  onDiffuse: () => void
}) {
  const { contenus, indices } = itemsDiffusables(snapshot, equipe.current_step)
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
      setErreur(messageErreur(e, 'Diffusion impossible.'))
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
          dejaDiffuse: false,
        }))
      : indices.map((h) => ({
          id: h.id,
          principal: h.body,
          secondaire: libelleDeclenchementIndice(h),
          dejaDiffuse: indiceDejaDiffuse(h, {
            stepStartedAt: equipe.step_started_at,
            pausedAt,
            diffuses,
          }),
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
            : ' Les indices peuvent être envoyés à tout moment, y compris avant leur déclenchement automatique.'}
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
            {liste.map((item) => {
              // « Déjà diffusé » ne vaut que pour l'équipe sélectionnée :
              // l'envoi groupé peut encore concerner les autres équipes.
              const bloque = item.dejaDiffuse && !toutesLesEquipes
              return (
                <li key={item.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block text-sm text-texte">{item.principal}</span>
                    <span className="block text-xs text-secondaire">{item.secondaire}</span>
                    {item.dejaDiffuse ? (
                      <span className="mt-1 inline-block">
                        <Badge ton="attention">déjà diffusé à {equipe.name}</Badge>
                      </span>
                    ) : null}
                  </span>
                  <Bouton onClick={() => void envoyer(item.id)} disabled={enCours !== null || bloque}>
                    {enCours === item.id ? 'envoi…' : bloque ? 'déjà diffusé' : 'Envoyer'}
                  </Bouton>
                </li>
              )
            })}
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
