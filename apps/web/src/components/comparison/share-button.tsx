'use client'

import { useState } from 'react'

export function ShareButton(): React.JSX.Element {
  const [isCopied, setIsCopied] = useState(false)

  async function handleShare(): Promise<void> {
    try {
      const url = window.location.href
      if (navigator.clipboard !== undefined) {
        await navigator.clipboard.writeText(url)
      } else {
        const textarea = document.createElement('textarea')
        textarea.value = url
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
      }
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch {
      // Silent fail — clipboard permission denied; button is progressive enhancement
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleShare()}
      aria-label="Copiar link desta comparação"
      aria-live="polite"
      className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {isCopied ? 'Copiado!' : 'Compartilhar'}
    </button>
  )
}
