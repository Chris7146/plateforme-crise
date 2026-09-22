import type { ReactNode } from 'react'
import { BandeauExercice } from './BandeauExercice'

/** Mise en page commune : bandeau exercice permanent + zone de contenu sombre. */
export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-fond text-texte">
      <BandeauExercice />
      <main className="flex-1">{children}</main>
    </div>
  )
}
