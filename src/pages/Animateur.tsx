import { useAuth } from '../auth/AuthContext'
import { Bouton, Carte } from '../components/ui'

/** Espace animateur (placeholder lot 0). L'éditeur arrive au lot 1. */
export function Animateur() {
  const { session, deconnexion } = useAuth()

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-12">
      <header className="flex items-center justify-between">
        <h1 className="text-xl text-vert">Espace animateur</h1>
        <Bouton variante="secondaire" onClick={() => void deconnexion()}>
          Se déconnecter
        </Bouton>
      </header>
      <Carte className="flex flex-col gap-2">
        <p className="text-sm text-secondaire">Connecté en tant que</p>
        <p className="text-texte">{session?.user.email}</p>
        <p className="mt-4 text-sm text-secondaire">
          Rôle animateur vérifié en base. L’éditeur de modèles et de variantes arrive au lot 1.
        </p>
      </Carte>
    </div>
  )
}
