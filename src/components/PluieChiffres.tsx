import { useEffect, useRef } from 'react'

/**
 * Pluie de chiffres de l'écran d'accueil (voir maquette `accueil.html`).
 * Effet décoratif réservé à l'accueil : les écrans de travail restent sobres.
 * Respecte « animations réduites » du système.
 */
export function PluieChiffres() {
  const toile = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = toile.current
    if (!canvas) return
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return

    // Hors navigateur (jsdom des tests), getContext lève : l'effet est
    // purement décoratif, on y renonce sans bruit.
    let contexte: CanvasRenderingContext2D | null = null
    try {
      contexte = canvas.getContext('2d')
    } catch {
      return
    }
    if (!contexte) return
    const dessin = contexte

    let animation = 0
    let colonnes: number[] = []
    const taillePolice = 13

    const redimensionner = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      colonnes = Array.from({ length: Math.ceil(canvas.width / taillePolice) }, () =>
        Math.random() * -40,
      )
    }
    redimensionner()
    window.addEventListener('resize', redimensionner)

    let dernier = 0
    const dessiner = (horodatage: number) => {
      animation = requestAnimationFrame(dessiner)
      if (horodatage - dernier < 30) return
      dernier = horodatage

      dessin.fillStyle = 'rgba(7, 16, 12, 0.25)'
      dessin.fillRect(0, 0, canvas.width, canvas.height)
      dessin.fillStyle = '#17402c'
      dessin.font = `${taillePolice}px monospace`
      colonnes.forEach((y, i) => {
        dessin.fillText(String(Math.floor(Math.random() * 10)), i * taillePolice, y * taillePolice)
        colonnes[i] = y * taillePolice > canvas.height && Math.random() > 0.97 ? 0 : y + 0.5
      })
    }
    animation = requestAnimationFrame(dessiner)

    return () => {
      cancelAnimationFrame(animation)
      window.removeEventListener('resize', redimensionner)
    }
  }, [])

  return (
    <canvas
      ref={toile}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full"
    />
  )
}
