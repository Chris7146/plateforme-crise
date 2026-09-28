import { useState } from 'react'
import { Bouton, Erreur, Modale, ZoneTexte } from '../ui'
import { envoyerMessageAnimateur, type Message } from '../../lib/console'
import type { Equipe } from '../../lib/sessions'

/** Échange de messages avec une équipe (RPC `send_staff_message`). */
export function ModaleMessage({
  equipe,
  messages,
  onFermer,
  onEnvoye,
}: {
  equipe: Equipe
  messages: Message[]
  onFermer: () => void
  onEnvoye: () => void
}) {
  const [corps, setCorps] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  const fil = messages.filter((m) => m.team_id === equipe.id)

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (corps.trim().length === 0) return
    setEnvoi(true)
    setErreur(null)
    try {
      await envoyerMessageAnimateur(equipe.id, corps)
      setCorps('')
      onEnvoye()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Message non envoyé.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <Modale titre={`Messages · ${equipe.name}`} onFermer={onFermer}>
      <div className="flex flex-col gap-4">
        {fil.length === 0 ? (
          <p className="text-sm text-secondaire">Aucun message échangé avec cette équipe.</p>
        ) : (
          <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto">
            {fil.map((message) => (
              <li
                key={message.id}
                className={`rounded border p-2 text-sm ${
                  message.from_staff
                    ? 'border-bordure bg-fond text-secondaire'
                    : 'border-bleu/40 bg-bleu/10 text-texte'
                }`}
              >
                <p className="text-[11px] text-secondaire">
                  {message.from_staff ? 'vous' : equipe.name} ·{' '}
                  {new Date(message.created_at).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
                <p className="mt-0.5 whitespace-pre-line">{message.body}</p>
              </li>
            ))}
          </ul>
        )}

        <form className="flex flex-col gap-3" onSubmit={envoyer}>
          <ZoneTexte
            label="Message à l’équipe"
            id="message-equipe"
            rows={3}
            maxLength={2000}
            value={corps}
            onChange={(e) => setCorps(e.target.value)}
          />
          <Erreur>{erreur}</Erreur>
          <div className="flex justify-end gap-3">
            <Bouton type="button" variante="secondaire" onClick={onFermer}>
              Fermer
            </Bouton>
            <Bouton type="submit" disabled={envoi || corps.trim().length === 0}>
              {envoi ? 'envoi…' : 'Envoyer'}
            </Bouton>
          </div>
        </form>
      </div>
    </Modale>
  )
}
