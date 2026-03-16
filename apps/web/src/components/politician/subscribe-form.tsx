'use client'

import { useState, type FormEvent } from 'react'

interface SubscribeFormProps {
  slug: string
}

type FormState = 'idle' | 'loading' | 'success' | 'error'

/**
 * Email alert subscription form for a politician profile (RF-POST-002).
 * Initiates the double opt-in flow by calling POST /api/v1/politicians/:slug/subscribe.
 * Renders as a client island inside the server-rendered profile page.
 *
 * DR-002: Uses factual language only — no qualitative judgment about the politician.
 */
export function SubscribeForm({ slug }: SubscribeFormProps): React.JSX.Element {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setState('loading')

    try {
      const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'
      const response = await fetch(`${apiUrl}/politicians/${encodeURIComponent(slug)}/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        const body = (await response.json()) as { title?: string }
        setErrorMsg(body.title ?? 'Erro ao processar inscrição.')
        setState('error')
        return
      }

      setState('success')
    } catch {
      setErrorMsg('Erro de conexão. Tente novamente.')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div
        role="status"
        aria-live="polite"
        className="rounded-md border border-border p-4 text-sm"
      >
        <p>Verifique seu email para confirmar a inscrição de alertas.</p>
      </div>
    )
  }

  return (
    <section aria-labelledby="subscribe-heading" className="mt-8 rounded-md border border-border p-4">
      <h2 id="subscribe-heading" className="mb-3 text-sm font-medium">
        Receber alertas de atualização de pontuação
      </h2>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="flex flex-col gap-3 sm:flex-row"
      >
        <label htmlFor="subscribe-email" className="sr-only">
          Email
        </label>
        <input
          id="subscribe-email"
          type="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          aria-label="Endereço de email para alertas"
          disabled={state === 'loading'}
          className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={state === 'loading' || email.length === 0}
          aria-busy={state === 'loading'}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {state === 'loading' ? 'Enviando...' : 'Inscrever-se'}
        </button>
      </form>
      {state === 'error' && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {errorMsg}
        </p>
      )}
    </section>
  )
}
