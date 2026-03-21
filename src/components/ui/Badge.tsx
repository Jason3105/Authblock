import React from 'react'
import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'accent' | 'success' | 'warning'
  className?: string
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-white/10 text-white/80 border-white/20',
    primary: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    accent: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    success: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    warning: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
