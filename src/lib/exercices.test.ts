import { describe, expect, it } from 'vitest'
import {
  formaterDuree,
  regrouperParModele,
  resumerCharge,
  resumerExercices,
  type Client,
  type Exercice,
} from './exercices'

function exercice(partiel: Partial<Exercice> & Pick<Exercice, 'id' | 'kind' | 'title'>): Exercice {
  return {
    description: null,
    client_id: null,
    source_id: null,
    max_content_score: 8,
    max_time_bonus: 2,
    created_by: null,
    created_at: '2026-09-01T10:00:00Z',
    updated_at: '2026-09-01T10:00:00Z',
    ...partiel,
  }
}

const client: Client = {
  id: 'cli-1',
  name: 'CHU de Valmont',
  created_at: '2026-09-01T10:00:00Z',
}

describe('formaterDuree', () => {
  it('formate en heures et minutes', () => {
    expect(formaterDuree(53 * 60)).toBe('0 h 53')
    expect(formaterDuree(60 * 60)).toBe('1 h 00')
    expect(formaterDuree(95 * 60)).toBe('1 h 35')
  })

  it('arrondit à la minute et borne à zéro', () => {
    expect(formaterDuree(89)).toBe('0 h 01')
    expect(formaterDuree(0)).toBe('0 h 00')
    expect(formaterDuree(-120)).toBe('0 h 00')
  })
})

describe('resumerCharge', () => {
  it('accorde le pluriel et indique les exercices vides', () => {
    expect(resumerCharge(6, 53 * 60)).toBe('6 étapes · 0 h 53')
    expect(resumerCharge(1, 5 * 60)).toBe('1 étape · 0 h 05')
    expect(resumerCharge(0, 0)).toBe('aucune étape')
  })
})

describe('resumerExercices', () => {
  it('agrège le nombre d’étapes et la durée par exercice', () => {
    const resumes = resumerExercices(
      [
        exercice({ id: 'ex-1', kind: 'template', title: 'Cyberattaque' }),
        exercice({ id: 'ex-2', kind: 'template', title: 'Inondation' }),
      ],
      [
        { exercise_id: 'ex-1', duration_seconds: 300 },
        { exercise_id: 'ex-1', duration_seconds: 600 },
        { exercise_id: 'ex-2', duration_seconds: 480 },
      ],
      [],
    )
    expect(resumes[0]).toMatchObject({ nbEtapes: 2, dureeSecondes: 900 })
    expect(resumes[1]).toMatchObject({ nbEtapes: 1, dureeSecondes: 480 })
  })

  it('laisse un exercice sans étape à zéro', () => {
    const [resume] = resumerExercices(
      [exercice({ id: 'ex-1', kind: 'template', title: 'Vide' })],
      [],
      [],
    )
    expect(resume).toMatchObject({ nbEtapes: 0, dureeSecondes: 0, nomClient: null })
  })

  it('résout le nom du client d’une variante', () => {
    const [resume] = resumerExercices(
      [exercice({ id: 'ex-2', kind: 'variant', title: 'Variante', client_id: 'cli-1' })],
      [],
      [client],
    )
    expect(resume.nomClient).toBe('CHU de Valmont')
  })

  it('tolère un client_id inconnu', () => {
    const [resume] = resumerExercices(
      [exercice({ id: 'ex-2', kind: 'variant', title: 'Variante', client_id: 'cli-absent' })],
      [],
      [client],
    )
    expect(resume.nomClient).toBeNull()
  })
})

describe('regrouperParModele', () => {
  const modeleA = exercice({ id: 'ex-a', kind: 'template', title: 'Alerte cyber' })
  const modeleB = exercice({ id: 'ex-b', kind: 'template', title: 'Inondation' })
  const varianteA1 = exercice({
    id: 'ex-a1',
    kind: 'variant',
    title: 'CHU de Valmont',
    source_id: 'ex-a',
  })
  const varianteA2 = exercice({
    id: 'ex-a2',
    kind: 'variant',
    title: 'Clinique du Parc',
    source_id: 'ex-a',
  })
  const orpheline = exercice({
    id: 'ex-o',
    kind: 'variant',
    title: 'Ancien modèle supprimé',
    source_id: null,
  })

  it('rattache chaque variante à son modèle', () => {
    const { groupes } = regrouperParModele(
      resumerExercices([varianteA1, modeleB, modeleA, varianteA2], [], []),
    )
    expect(groupes.map((g) => g.modele.exercice.id)).toEqual(['ex-a', 'ex-b'])
    // Tri alphabétique : « CHU de Valmont » avant « Clinique du Parc ».
    expect(groupes[0].variantes.map((v) => v.exercice.id)).toEqual(['ex-a1', 'ex-a2'])
    expect(groupes[1].variantes).toEqual([])
  })

  it('isole les variantes dont le modèle a disparu', () => {
    const { groupes, orphelines } = regrouperParModele(
      resumerExercices([modeleA, orpheline], [], []),
    )
    expect(groupes).toHaveLength(1)
    expect(orphelines.map((v) => v.exercice.id)).toEqual(['ex-o'])
  })

  it('traite une filiation pointant vers un modèle absent comme orpheline', () => {
    const fantome = exercice({
      id: 'ex-f',
      kind: 'variant',
      title: 'Filiation cassée',
      source_id: 'ex-inconnu',
    })
    const { orphelines } = regrouperParModele(resumerExercices([modeleA, fantome], [], []))
    expect(orphelines.map((v) => v.exercice.id)).toEqual(['ex-f'])
  })

  it('n’affiche jamais une variante deux fois', () => {
    const { groupes, orphelines } = regrouperParModele(
      resumerExercices([modeleA, varianteA1, orpheline], [], []),
    )
    const affichees = [...groupes.flatMap((g) => g.variantes), ...orphelines]
    expect(new Set(affichees.map((v) => v.exercice.id)).size).toBe(affichees.length)
    expect(affichees).toHaveLength(2)
  })
})
