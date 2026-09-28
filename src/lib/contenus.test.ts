import { describe, expect, it } from 'vitest'
import {
  basculerChoix,
  decrireReponse,
  decrireReponseType,
  lireChoix,
  lireChoixMultiples,
  lireContenus,
  lireOuiNon,
  lireQuestions,
  lireTexte,
  questionsManquantes,
  reponseRenseignee,
  reponseVide,
  type QuestionDiffusee,
} from './contenus'

describe('lireContenus', () => {
  it('lit les contenus diffusés', () => {
    expect(
      lireContenus([
        { id: 'c-1', type: 'article', title: 'Flash info', body: 'Texte', media_path: null },
        { id: 'c-2', type: 'image', title: 'Carte', body: null, media_path: 'ex/carte.png' },
      ]),
    ).toEqual([
      { id: 'c-1', type: 'article', title: 'Flash info', body: 'Texte', media_path: null },
      { id: 'c-2', type: 'image', title: 'Carte', body: null, media_path: 'ex/carte.png' },
    ])
  })

  it('ignore les éléments mal formés plutôt que de casser l’écran', () => {
    expect(lireContenus(null)).toEqual([])
    expect(lireContenus([null, 42, {}, { id: 'c-1', type: 'inconnu' }])).toEqual([])
  })

  it('tolère un titre absent', () => {
    expect(lireContenus([{ id: 'c-1', type: 'text' }])).toEqual([
      { id: 'c-1', type: 'text', title: '', body: null, media_path: null },
    ])
  })
})

describe('lireQuestions', () => {
  it('lit les questions et leurs options', () => {
    expect(
      lireQuestions([
        {
          id: 'q-1',
          type: 'single_choice',
          prompt: 'Priorité ?',
          options: [{ id: 'a', label: 'Urgences' }],
          mandatory: true,
        },
      ]),
    ).toEqual([
      {
        id: 'q-1',
        type: 'single_choice',
        prompt: 'Priorité ?',
        options: [{ id: 'a', label: 'Urgences' }],
        mandatory: true,
      },
    ])
  })

  it('considère une question obligatoire par défaut', () => {
    expect(lireQuestions([{ id: 'q-1', type: 'open', prompt: 'Alors ?' }])[0].mandatory).toBe(true)
    expect(
      lireQuestions([{ id: 'q-1', type: 'open', prompt: 'Alors ?', mandatory: false }])[0]
        .mandatory,
    ).toBe(false)
  })

  it('n’expose jamais réponse type ni barème, même si elles traînaient dans la charge', () => {
    const lues = lireQuestions([
      {
        id: 'q-1',
        type: 'open',
        prompt: 'Alors ?',
        expected_answer: 'la réponse type',
        scoring_guide: '10 pts',
      },
    ])
    expect(JSON.stringify(lues)).not.toContain('réponse type')
    expect(JSON.stringify(lues)).not.toContain('10 pts')
  })
})

describe('format des réponses', () => {
  it('produit une réponse vide adaptée au type', () => {
    expect(reponseVide('open')).toEqual({ text: '' })
    expect(reponseVide('single_choice')).toEqual({ choice: null })
    expect(reponseVide('multiple_choice')).toEqual({ choices: [] })
    expect(reponseVide('yes_no')).toEqual({ yes: null })
  })

  it('relit chaque forme de réponse', () => {
    expect(lireTexte({ text: 'Communiqué' })).toBe('Communiqué')
    expect(lireChoix({ choice: 'a' })).toBe('a')
    expect(lireChoixMultiples({ choices: ['a', 'b'] })).toEqual(['a', 'b'])
    expect(lireOuiNon({ yes: false })).toBe(false)
  })

  it('résiste à des valeurs absentes ou d’un autre type', () => {
    expect(lireTexte(null)).toBe('')
    expect(lireTexte({ text: 42 })).toBe('')
    expect(lireChoix({})).toBeNull()
    expect(lireChoixMultiples({ choices: 'a' })).toEqual([])
    expect(lireChoixMultiples({ choices: ['a', 7, null] })).toEqual(['a'])
    expect(lireOuiNon({ yes: 'oui' })).toBeNull()
  })
})

describe('basculerChoix', () => {
  it('ajoute puis retire une option', () => {
    expect(basculerChoix({ choices: [] }, 'a')).toEqual({ choices: ['a'] })
    expect(basculerChoix({ choices: ['a', 'b'] }, 'a')).toEqual({ choices: ['b'] })
  })

  it('part d’une liste vide si la réponse est absente', () => {
    expect(basculerChoix(undefined, 'a')).toEqual({ choices: ['a'] })
  })
})

describe('reponseRenseignee', () => {
  it('ne compte pas un texte fait d’espaces', () => {
    expect(reponseRenseignee('open', { text: '   ' })).toBe(false)
    expect(reponseRenseignee('open', { text: 'Oui' })).toBe(true)
  })

  it('accepte « non » comme réponse à une question oui/non', () => {
    expect(reponseRenseignee('yes_no', { yes: false })).toBe(true)
    expect(reponseRenseignee('yes_no', { yes: null })).toBe(false)
  })

  it('exige au moins une case cochée en choix multiple', () => {
    expect(reponseRenseignee('multiple_choice', { choices: [] })).toBe(false)
    expect(reponseRenseignee('multiple_choice', { choices: ['a'] })).toBe(true)
  })
})

describe('questionsManquantes', () => {
  const questions: QuestionDiffusee[] = [
    { id: 'q-1', type: 'open', prompt: 'Obligatoire', options: [], mandatory: true },
    { id: 'q-2', type: 'open', prompt: 'Facultative', options: [], mandatory: false },
  ]

  it('ne signale que les questions obligatoires sans réponse', () => {
    expect(questionsManquantes(questions, {}).map((q) => q.id)).toEqual(['q-1'])
    expect(questionsManquantes(questions, { 'q-1': { text: 'Fait' } })).toEqual([])
  })

  it('tolère l’absence de brouillons', () => {
    expect(questionsManquantes(questions, undefined).map((q) => q.id)).toEqual(['q-1'])
  })
})

describe('decrireReponse', () => {
  const options = [
    { id: 'a', label: 'Isoler le réseau' },
    { id: 'b', label: 'Plan blanc' },
  ]

  it('rend les choix par leur libellé, pas leur identifiant', () => {
    expect(decrireReponse('single_choice', { choice: 'a' }, options)).toBe('Isoler le réseau')
    expect(decrireReponse('multiple_choice', { choices: ['a', 'b'] }, options)).toBe(
      'Isoler le réseau · Plan blanc',
    )
  })

  it('retombe sur l’identifiant si l’option a disparu du snapshot', () => {
    expect(decrireReponse('single_choice', { choice: 'z' }, options)).toBe('z')
  })

  it('rend les réponses ouvertes et oui/non', () => {
    expect(decrireReponse('open', { text: 'Communiqué' })).toBe('Communiqué')
    expect(decrireReponse('yes_no', { yes: false })).toBe('non')
  })

  it('signale une réponse absente', () => {
    expect(decrireReponse('open', { text: '  ' })).toBe('aucune réponse')
    expect(decrireReponse('multiple_choice', { choices: [] })).toBe('aucune réponse')
    expect(decrireReponse('yes_no', undefined)).toBe('aucune réponse')
  })
})

describe('decrireReponseType', () => {
  const options = [{ id: 'a', label: 'Isoler le réseau' }]

  it('rend le texte libre saisi dans l’éditeur', () => {
    expect(decrireReponseType('Isoler le réseau, alerter la DSI')).toBe(
      'Isoler le réseau, alerter la DSI',
    )
  })

  it('accepte aussi le format des réponses d’équipe', () => {
    expect(decrireReponseType({ text: 'Communiqué' })).toBe('Communiqué')
    expect(decrireReponseType({ choice: 'a' }, options)).toBe('Isoler le réseau')
    expect(decrireReponseType({ choices: ['a'] }, options)).toBe('Isoler le réseau')
    expect(decrireReponseType({ yes: true })).toBe('oui')
  })

  it('signale l’absence de réponse type', () => {
    expect(decrireReponseType(null)).toBe('aucune réponse type saisie')
    expect(decrireReponseType('   ')).toBe('aucune réponse type saisie')
    expect(decrireReponseType(42)).toBe('aucune réponse type saisie')
  })
})
