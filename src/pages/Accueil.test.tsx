import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Accueil } from './Accueil'

vi.mock('../lib/participant', async (importOriginal) => {
  const reel = await importOriginal<typeof import('../lib/participant')>()
  return { ...reel, rejoindreEquipe: vi.fn(), lireEquipeMemorisee: vi.fn() }
})

const { rejoindreEquipe, lireEquipeMemorisee } = await import('../lib/participant')

function afficher(entree = '/') {
  return render(
    <MemoryRouter initialEntries={[entree]}>
      <Routes>
        <Route path="/" element={<Accueil />} />
        <Route path="/participant/:id" element={<p>écran participant</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('accueil participant', () => {
  beforeEach(() => {
    vi.mocked(lireEquipeMemorisee).mockReturnValue(null)
    vi.mocked(rejoindreEquipe).mockResolvedValue('eq-1')
  })

  it('n’autorise à continuer qu’avec un code complet et un prénom', async () => {
    const utilisateur = userEvent.setup()
    afficher()
    const continuer = screen.getByRole('button', { name: 'Continuer' })
    expect(continuer).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Code d’équipe'), '7KQ2M')
    await utilisateur.type(screen.getByLabelText('Votre prénom'), 'Camille')
    expect(continuer).toBeDisabled()

    await utilisateur.type(screen.getByLabelText('Code d’équipe'), 'V')
    expect(continuer).toBeEnabled()
  })

  it('met le code en majuscules et retire les séparateurs', async () => {
    const utilisateur = userEvent.setup()
    afficher()
    await utilisateur.type(screen.getByLabelText('Code d’équipe'), '7kq-2mv')
    expect(screen.getByLabelText('Code d’équipe')).toHaveValue('7KQ2MV')
  })

  it('pré-remplit le code venu du QR code', () => {
    afficher('/?code=7kq2mv')
    expect(screen.getByLabelText('Code d’équipe')).toHaveValue('7KQ2MV')
  })

  it('n’entre dans l’équipe qu’après acceptation des conditions', async () => {
    const utilisateur = userEvent.setup()
    afficher('/?code=7KQ2MV')
    await utilisateur.type(screen.getByLabelText('Votre prénom'), 'Camille')
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer' }))

    const commencer = screen.getByRole('button', { name: /commencer la simulation/ })
    expect(commencer).toBeDisabled()
    expect(rejoindreEquipe).not.toHaveBeenCalled()

    await utilisateur.click(screen.getByRole('checkbox'))
    expect(commencer).toBeEnabled()
    await utilisateur.click(commencer)

    await waitFor(() => expect(rejoindreEquipe).toHaveBeenCalledWith('7KQ2MV', 'Camille', true))
    expect(await screen.findByText('écran participant')).toBeInTheDocument()
  })

  it('affiche un message clair si le code est inconnu', async () => {
    const utilisateur = userEvent.setup()
    vi.mocked(rejoindreEquipe).mockRejectedValue(new Error("Code d'équipe inconnu"))
    afficher('/?code=7KQ2MV')
    await utilisateur.type(screen.getByLabelText('Votre prénom'), 'Camille')
    await utilisateur.click(screen.getByRole('button', { name: 'Continuer' }))
    await utilisateur.click(screen.getByRole('checkbox'))
    await utilisateur.click(screen.getByRole('button', { name: /commencer la simulation/ }))

    expect(
      await screen.findByText(/Code inconnu\. Vérifiez les six caractères/),
    ).toBeInTheDocument()
  })

  it('propose de revenir à son équipe quand l’appareil en mémorise une', () => {
    vi.mocked(lireEquipeMemorisee).mockReturnValue({ equipeId: 'eq-9', prenom: 'Camille' })
    afficher()
    expect(screen.getByRole('button', { name: 'Revenir à mon équipe' })).toBeInTheDocument()
    expect(screen.getByLabelText('Votre prénom')).toHaveValue('Camille')
  })
})
