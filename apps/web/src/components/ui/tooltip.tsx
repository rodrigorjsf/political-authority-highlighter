'use client'

import { useId, useState } from 'react'

interface TooltipProps {
  content: string
  children: React.ReactNode
  /** Optional: extra class applied to the tooltip bubble. */
  className?: string
}

/**
 * Accessible tooltip with 150ms fade-in/out.
 * Animation respects prefers-reduced-motion via Tailwind motion-safe: prefix.
 * Uses aria-describedby for screen reader support.
 */
export function Tooltip({ content, children, className = '' }: TooltipProps): React.JSX.Element {
  const [visible, setVisible] = useState(false)
  const tooltipId = useId()

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {/* Wrap children with describedby reference */}
      <span aria-describedby={visible ? tooltipId : undefined}>{children}</span>

      {/* Tooltip bubble */}
      <span
        id={tooltipId}
        role="tooltip"
        aria-hidden={!visible}
        className={`pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-xs font-medium text-background shadow-md motion-safe:transition-opacity motion-safe:duration-150 ${
          visible ? 'opacity-100' : 'opacity-0'
        } ${className}`}
      >
        {content}
        {/* Arrow */}
        <span
          aria-hidden="true"
          className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-foreground"
        />
      </span>
    </span>
  )
}
