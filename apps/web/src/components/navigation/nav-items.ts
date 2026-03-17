import { Home, Search, BookOpen, Database, Scale } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  ariaLabel: string
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Início', icon: Home, ariaLabel: 'Ir para o início' },
  { href: '/politicos', label: 'Buscar', icon: Search, ariaLabel: 'Buscar políticos' },
  { href: '/metodologia', label: 'Metodologia', icon: BookOpen, ariaLabel: 'Ver metodologia de pontuação' },
  { href: '/fontes', label: 'Fontes', icon: Database, ariaLabel: 'Ver fontes de dados governamentais' },
  { href: '/comparar', label: 'Comparar', icon: Scale, ariaLabel: 'Comparar políticos' },
]
