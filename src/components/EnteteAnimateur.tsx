import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthContext'
import { Bouton } from './ui'

/** En-tête commun aux écrans animateur : identité, titre de l'écran, actions. */
export function EnteteAnimateur({
  titre,
  sousTitre,
  actions,
}: {
  titre: string
  sousTitre?: ReactNode
  actions?: ReactNode
}) {
  const { session, deconnexion } = useAuth()

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-bordure pb-4">
      <div className="min-w-0">
        {sousTitre ? <div className="text-xs text-secondaire">{sousTitre}</div> : null}
        <h1 className="text-xl text-vert">{titre}</h1>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {actions}
        <span className="text-xs text-secondaire">{session?.user.email}</span>
        <Bouton variante="secondaire" onClick={() => void deconnexion()}>
          Se déconnecter
        </Bouton>
      </div>
    </header>
  )
}
