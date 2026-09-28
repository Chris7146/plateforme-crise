import { useState } from 'react'
import { Bouton, Erreur } from '../ui'
import { envoyerMessage, type VueEquipe } from '../../lib/participant'

/** Messagerie avec l'animateur (lot 3). Les messages sont journalisés côté base. */
export function Messagerie({
  vue,
  equipeId,
  onApresAction,
}: {
  vue: VueEquipe
  equipeId: string
  onApresAction: () => void
}) {
  const [corps, setCorps] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [envoi, setEnvoi] = useState(false)

  async function envoyer(e: React.FormEvent) {
    e.preventDefault()
    if (corps.trim().length === 0) return
    setEnvoi(true)
    setErreur(null)
    try {
      await envoyerMessage(equipeId, corps)
      setCorps('')
      onApresAction()
    } catch (err) {
      setErreur(err instanceof Error ? err.message : 'Message non envoyé.')
    } finally {
      setEnvoi(false)
    }
  }

  return (
    <section
      className="flex flex-col gap-3 rounded-lg border border-bordure bg-carte p-4"
      aria-label="Messages avec l’animateur"
    >
      <h2 className="text-xs text-secondaire">animateur</h2>

      {vue.messages.length === 0 ? (
        <p className="text-sm text-secondaire">Aucun message.</p>
      ) : (
        <ul className="flex max-h-60 flex-col gap-2 overflow-y-auto">
          {vue.messages.map((message) => (
            <li
              key={message.id}
              className={`rounded border p-2 text-sm ${
                message.from_staff
                  ? 'border-bleu/40 bg-bleu/10 text-texte'
                  : 'border-bordure bg-fond text-secondaire'
              }`}
            >
              <p className="text-[11px] text-secondaire">
                {message.from_staff ? 'animateur' : 'votre équipe'} ·{' '}
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

      <form className="flex gap-2" onSubmit={envoyer}>
        <label className="sr-only" htmlFor="message-animateur">
          Écrire à l’animateur
        </label>
        <input
          id="message-animateur"
          value={corps}
          maxLength={500}
          onChange={(e) => setCorps(e.target.value)}
          placeholder="Écrire à l’animateur"
          className="min-h-[44px] flex-1 rounded border border-bordure bg-fond px-3 text-sm text-texte placeholder:text-secondaire/60 focus:border-bleu focus:outline-none"
        />
        <Bouton type="submit" disabled={envoi || corps.trim().length === 0}>
          Envoyer
        </Bouton>
      </form>

      <Erreur>{erreur}</Erreur>
    </section>
  )
}
