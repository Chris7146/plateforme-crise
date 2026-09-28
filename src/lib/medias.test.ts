import { describe, expect, it } from 'vitest'
import {
  cheminMedia,
  estTropVolumineux,
  formaterTaille,
  nettoyerNomFichier,
  SEUIL_AVERTISSEMENT_OCTETS,
  typeContenuDepuisMime,
} from './medias'

describe('nettoyerNomFichier', () => {
  it('retire accents, espaces et caractères spéciaux', () => {
    expect(nettoyerNomFichier('Carte des services touchés.PNG')).toBe(
      'carte-des-services-touches.png',
    )
    expect(nettoyerNomFichier('rapport (v2)#final.pdf')).toBe('rapport-v2-final.pdf')
  })

  it('produit toujours un nom exploitable', () => {
    expect(nettoyerNomFichier('   ')).toBe('fichier')
    expect(nettoyerNomFichier('###')).toBe('fichier')
  })

  it('borne la longueur du nom', () => {
    expect(nettoyerNomFichier('a'.repeat(200)).length).toBe(80)
  })
})

describe('cheminMedia', () => {
  it('range le fichier dans le dossier de l’exercice, horodaté', () => {
    expect(cheminMedia('ex-1', 'Sirène.mp3', 1_700_000_000_000)).toBe(
      'ex-1/1700000000000-sirene.mp3',
    )
  })
})

describe('formaterTaille', () => {
  it('choisit l’unité lisible', () => {
    expect(formaterTaille(512)).toBe('512 o')
    expect(formaterTaille(2048)).toBe('2 ko')
    expect(formaterTaille(52_428_800)).toBe('50,0 Mo')
  })
})

describe('estTropVolumineux', () => {
  it('avertit au-delà de 50 Mo', () => {
    expect(estTropVolumineux(SEUIL_AVERTISSEMENT_OCTETS)).toBe(false)
    expect(estTropVolumineux(SEUIL_AVERTISSEMENT_OCTETS + 1)).toBe(true)
  })
})

describe('typeContenuDepuisMime', () => {
  it('devine le type à partir du MIME', () => {
    expect(typeContenuDepuisMime('video/mp4')).toBe('video')
    expect(typeContenuDepuisMime('image/png')).toBe('image')
    expect(typeContenuDepuisMime('audio/mpeg')).toBe('audio')
    expect(typeContenuDepuisMime('application/pdf')).toBe('document')
    expect(typeContenuDepuisMime('')).toBe('document')
  })
})
