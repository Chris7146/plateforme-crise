import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

/**
 * QR code d'accès à une équipe, rendu en image locale (aucun service externe :
 * les codes d'accès ne sortent jamais du navigateur de l'animateur).
 */
export function QrCode({ valeur, taille = 160 }: { valeur: string; taille?: number }) {
  const [image, setImage] = useState<string | null>(null)

  useEffect(() => {
    let actif = true
    QRCode.toDataURL(valeur, {
      width: taille,
      margin: 1,
      // Contraste suffisant à la projection comme à l'impression.
      color: { dark: '#07100c', light: '#ffffff' },
    })
      .then((url) => {
        if (actif) setImage(url)
      })
      .catch(() => {
        if (actif) setImage(null)
      })
    return () => {
      actif = false
    }
  }, [valeur, taille])

  if (!image) {
    return (
      <div
        style={{ width: taille, height: taille }}
        className="rounded border border-bordure bg-carte"
        aria-hidden="true"
      />
    )
  }

  return (
    <img
      src={image}
      width={taille}
      height={taille}
      alt={`QR code d’accès : ${valeur}`}
      className="rounded bg-white"
    />
  )
}
