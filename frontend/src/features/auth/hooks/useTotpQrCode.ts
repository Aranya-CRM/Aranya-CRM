import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function useTotpQrCode(qrUri: string): string {
  const [qrDataUrl, setQrDataUrl] = useState('')

  useEffect(() => {
    let active = true

    async function buildQrCode() {
      if (!qrUri) {
        setQrDataUrl('')
        return
      }

      try {
        const dataUrl = await QRCode.toDataURL(qrUri, {
          errorCorrectionLevel: 'M',
          margin: 2,
          scale: 6,
          width: 180,
        })

        if (active) {
          setQrDataUrl(dataUrl)
        }
      } catch {
        if (active) {
          setQrDataUrl('')
        }
      }
    }

    void buildQrCode()

    return () => {
      active = false
    }
  }, [qrUri])

  return qrDataUrl
}
