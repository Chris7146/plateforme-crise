import { describe, expect, it } from 'vitest'
import {
  aBesoinOptions,
  estMedia,
  identifiantOption,
  libelleDeclenchement,
  libelleTypeContenu,
  libelleTypeQuestion,
  lireOptions,
  resumerAttendu,
  validerQuestion,
} from './elements'

describe('libellés', () => {
  it('traduit les types de contenu et de question', () => {
    expect(libelleTypeContenu('video')).toBe('vidéo')
    expect(libelleTypeContenu('text')).toBe('texte')
    expect(libelleTypeQuestion('single_choice')).toBe('choix unique')
    expect(libelleTypeQuestion('yes_no')).toBe('oui/non')
  })
})

describe('libelleDeclenchement', () => {
  it('décrit un déclenchement automatique en T+', () => {
    expect(libelleDeclenchement('auto', 0)).toBe('auto · T+0')
    expect(libelleDeclenchement('auto', 120)).toBe('auto · T+2 min')
  })

  it('ignore le décalage pour un déclenchement manuel', () => {
    expect(libelleDeclenchement('manual', 300)).toBe('manuel')
  })
})

describe('estMedia', () => {
  it('distingue les contenus à fichier des contenus rédigés', () => {
    expect(estMedia('video')).toBe(true)
    expect(estMedia('document')).toBe(true)
    expect(estMedia('article')).toBe(false)
    expect(estMedia('text')).toBe(false)
  })
})

describe('lireOptions', () => {
  it('lit les options bien formées', () => {
    expect(lireOptions([{ id: 'a', label: 'Confiner' }])).toEqual([{ id: 'a', label: 'Confiner' }])
  })

  it('ignore les valeurs mal formées sans lever d’erreur', () => {
    expect(lireOptions(null)).toEqual([])
    expect(lireOptions('texte')).toEqual([])
    expect(lireOptions([{ id: 'a' }, null, 42, { id: 1, label: 'x' }])).toEqual([])
  })
})

describe('identifiantOption', () => {
  it('produit des identifiants lisibles et distincts', () => {
    expect(identifiantOption(0)).toBe('a')
    expect(identifiantOption(25)).toBe('z')
    expect(identifiantOption(26)).toBe('a2')
    expect(identifiantOption(27)).toBe('b2')
  })
})

describe('validerQuestion', () => {
  const options = [
    { id: 'a', label: 'Confiner' },
    { id: 'b', label: 'Évacuer' },
  ]

  it('exige un intitulé', () => {
    expect(validerQuestion('open', '   ', [])).toBe('L’intitulé de la question est obligatoire.')
  })

  it('exige deux options pour une question à choix', () => {
    expect(validerQuestion('single_choice', 'Que faites-vous ?', [options[0]])).toBe(
      'Une question à choix demande au moins deux options.',
    )
    expect(validerQuestion('multiple_choice', 'Que faites-vous ?', options)).toBeNull()
  })

  it('n’exige pas d’options pour une question ouverte ou oui/non', () => {
    expect(validerQuestion('open', 'Réponse au journaliste', [])).toBeNull()
    expect(validerQuestion('yes_no', 'Activez-vous la cellule de crise ?', [])).toBeNull()
  })

  it('ne compte pas les options laissées vides', () => {
    expect(validerQuestion('single_choice', 'Choix', [options[0], { id: 'b', label: '  ' }])).toBe(
      'Une question à choix demande au moins deux options.',
    )
  })
})

describe('aBesoinOptions', () => {
  it('ne concerne que les questions à choix', () => {
    expect(aBesoinOptions('single_choice')).toBe(true)
    expect(aBesoinOptions('multiple_choice')).toBe(true)
    expect(aBesoinOptions('open')).toBe(false)
    expect(aBesoinOptions('yes_no')).toBe(false)
  })
})

describe('resumerAttendu', () => {
  it('signale une question sans réponse type ni barème', () => {
    expect(resumerAttendu({ expected_answer: null, scoring_guide: null })).toBe(
      'aucune réponse type saisie',
    )
  })

  it('assemble réponse type et barème', () => {
    expect(
      resumerAttendu({ expected_answer: 'Désigner un porte-parole', scoring_guide: '10 pts' }),
    ).toBe('attendu : Désigner un porte-parole · 10 pts')
    expect(resumerAttendu({ expected_answer: null, scoring_guide: 'grille animateur' })).toBe(
      'attendu : grille animateur',
    )
  })
})
