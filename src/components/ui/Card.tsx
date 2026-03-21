import React from 'react'
import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  hover?: boolean
  glow?: boolean
  style?: React.CSSProperties
}

export function Card({ children, className, hover = true, glow = false, style }: CardProps) {
  return (
    <div
      className={cn(
        'relative bg-white rounded-2xl border border-slate-200 shadow-sm',
        hover && 'transition-all duration-300 hover:border-blue-200 hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/5',
        glow && 'shadow-lg shadow-blue-500/10',
        className
      )}
      style={style}
    >
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: React.ReactNode
  className?: string
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('p-6 pb-0', className)}>
      {children}
    </div>
  )
}

interface CardContentProps {
  children: React.ReactNode
  className?: string
}

export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  )
}
