import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './AuthContext'

/**
 * Protège les routes animateur. La sécurité réelle vit en base (RPC + RLS) ;
 * cette garde ne fait qu'éviter d'afficher une console à un visiteur non habilité.
 */
export function GardeAnimateur({ children }: { children: ReactNode }) {
  const { session, estAnimateur, chargement } = useAuth()
  const location = useLocation()

  if (chargement) {
    return (
      <div className="flex min-h-screen items-center justify-center text-secondaire">
        Vérification de l’accès…
      </div>
    )
  }

  if (!session || !estAnimateur) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}
