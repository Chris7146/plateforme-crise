import { Link } from 'react-router-dom'
import { Carte } from '../components/ui'

/** Accueil (placeholder lot 0). Le parcours participant arrive au lot 2. */
export function Accueil() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-16">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl text-vert">Plateforme de simulation de crise</h1>
        <p className="text-secondaire">
          Exercices de gestion de crise joués en salle. Socle en place (lot 0).
        </p>
      </header>

      <Carte className="flex flex-col gap-3">
        <p className="text-sm text-secondaire">
          Le parcours participant (saisie du code d’équipe) sera ajouté au lot 2.
        </p>
        <Link to="/connexion" className="text-bleu underline underline-offset-4">
          Accès animateur →
        </Link>
      </Carte>
    </div>
  )
}
