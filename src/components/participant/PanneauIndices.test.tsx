import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PanneauIndices } from './PanneauIndices'
import type { Indice } from '../../lib/participant'

vi.mock('../../lib/participant', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../../lib/participant')>()
  return { ...reel, ouvrirIndice: vi.fn() }
})
vi.mock('../../lib/sonAlerte', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../../lib/sonAlerte')>()
  return { ...reel, jouerSignalIndice: vi.fn() }
})

const { ouvrirIndice } = await import('../../lib/participant')
const { jouerSignalIndice } = await import('../../lib/sonAlerte')

function indice(partiel: Partial<Indice> & { id: string }): Indice {
  return {
    released_at: '2026-10-02T14:32:00Z',
    opened: false,
    body: null,
    ...partiel,
  }
}

function afficher(indices: Indice[]) {
  return render(<PanneauIndices indices={indices} equipeId="eq-1" />)
}

describe('panneau des indices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('annonce un indice reçu sans révéler son texte', () => {
    afficher([indice({ id: 'h-1' })])
    expect(screen.getByText('Nouvel indice reçu')).toBeInTheDocument()
    expect(screen.getByText('Nouveau')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ouvrir l’indice' })).toBeInTheDocument()
    expect(screen.getByText('1 indice')).toBeInTheDocument()
  })

  it('ne joue aucun son au chargement initial', () => {
    // Rechargement de page ou restauration d'état : le visuel seul suffit.
    afficher([indice({ id: 'h-1' }), indice({ id: 'h-2' })])
    expect(jouerSignalIndice).not.toHaveBeenCalled()
  })

  it('joue le son quand un indice arrive en cours de session, une seule fois', () => {
    const { rerender } = afficher([indice({ id: 'h-1' })])
    expect(jouerSignalIndice).not.toHaveBeenCalled()

    rerender(
      <PanneauIndices indices={[indice({ id: 'h-1' }), indice({ id: 'h-2' })]} equipeId="eq-1" />,
    )
    expect(jouerSignalIndice).toHaveBeenCalledTimes(1)

    // Relecture périodique ou reconnexion : mêmes indices, nouveau tableau.
    rerender(
      <PanneauIndices indices={[indice({ id: 'h-1' }), indice({ id: 'h-2' })]} equipeId="eq-1" />,
    )
    expect(jouerSignalIndice).toHaveBeenCalledTimes(1)
  })

  it('ne joue aucun son quand le participant l’a coupé', async () => {
    // Le réglage est porté par sonAlerte lui-même : ici on vérifie le bouton.
    const utilisateur = userEvent.setup()
    afficher([indice({ id: 'h-1' })])
    await utilisateur.click(screen.getByRole('button', { name: /couper le son/ }))
    expect(localStorage.getItem('crise.sonIndices')).toBe('coupe')
    expect(screen.getByRole('button', { name: /réactiver le son/ })).toBeInTheDocument()
  })

  it('révèle le texte à l’ouverture et retire le badge', async () => {
    const utilisateur = userEvent.setup()
    vi.mocked(ouvrirIndice).mockResolvedValue(
      indice({ id: 'h-1', opened: true, body: 'Relisez la fiche réflexe.' }),
    )
    afficher([indice({ id: 'h-1' })])

    await utilisateur.click(screen.getByRole('button', { name: 'Ouvrir l’indice' }))

    expect(ouvrirIndice).toHaveBeenCalledWith('eq-1', 'h-1')
    expect(await screen.findByText('Relisez la fiche réflexe.')).toBeInTheDocument()
    expect(screen.queryByText('Nouveau')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ouvrir l’indice' })).not.toBeInTheDocument()
  })

  it('n’enregistre l’ouverture qu’une fois, même après plusieurs clics', async () => {
    const utilisateur = userEvent.setup()
    vi.mocked(ouvrirIndice).mockResolvedValue(indice({ id: 'h-1', opened: true, body: 'Texte.' }))
    afficher([indice({ id: 'h-1' })])

    await utilisateur.click(screen.getByRole('button', { name: 'Ouvrir l’indice' }))
    await screen.findByText('Texte.')
    // Le bouton a disparu : l'indice reste relisible sans nouvel appel.
    await utilisateur.click(screen.getByText('Texte.'))
    expect(ouvrirIndice).toHaveBeenCalledTimes(1)
  })

  it('n’appelle pas le serveur pour un indice déjà ouvert restauré par la vue', () => {
    // Après rechargement, get_team_view renvoie le texte des indices ouverts.
    afficher([indice({ id: 'h-1', opened: true, body: 'Indice déjà lu.' })])
    expect(screen.getByText('Indice déjà lu.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ouvrir l’indice' })).not.toBeInTheDocument()
    expect(ouvrirIndice).not.toHaveBeenCalled()
  })

  it('signale une ouverture impossible sans perdre l’indice', async () => {
    const utilisateur = userEvent.setup()
    vi.mocked(ouvrirIndice).mockRejectedValue(new Error('réseau'))
    afficher([indice({ id: 'h-1' })])

    await utilisateur.click(screen.getByRole('button', { name: 'Ouvrir l’indice' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Indice indisponible')
    expect(screen.getByRole('button', { name: 'Ouvrir l’indice' })).toBeInTheDocument()
    expect(screen.getByText('Nouveau')).toBeInTheDocument()
  })

  it('traite un indice automatique comme un indice manuel', async () => {
    // La vue d'équipe ne distingue pas les modes : même rendu, même action.
    vi.mocked(ouvrirIndice).mockResolvedValue(indice({ id: 'auto-1', opened: true, body: 'T+.' }))
    const { unmount } = afficher([indice({ id: 'auto-1' })])
    const rendu = screen.getByRole('complementary', { name: 'Indices' }).innerHTML
    unmount()

    afficher([indice({ id: 'manuel-1' })])
    const attendu = screen.getByRole('complementary', { name: 'Indices' }).innerHTML
    expect(rendu).toBe(attendu)
  })

  it('affiche le compteur et l’état vide', () => {
    afficher([])
    expect(screen.getByText('Aucun indice pour le moment.')).toBeInTheDocument()
    expect(screen.getByText('0 indice')).toBeInTheDocument()
  })
})
