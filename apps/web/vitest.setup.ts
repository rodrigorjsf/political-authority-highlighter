import '@testing-library/jest-dom'
import { vi } from 'vitest'
import React from 'react'

// Mock next/image — renders a plain <img> in test environment
vi.mock('next/image', () => ({
  default: ({
    src,
    alt,
    fill: _fill,
    sizes: _sizes,
    priority: _priority,
    loading: _loading,
    style,
  }: {
    src: string
    alt: string
    fill?: boolean
    sizes?: string
    priority?: boolean
    loading?: string
    style?: React.CSSProperties
  }) => React.createElement('img', { src, alt, style }),
}))

// Mock next/link — renders a plain <a> in test environment
vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string
    children: React.ReactNode
    className?: string
  }) => React.createElement('a', { href, className }, children),
}))
