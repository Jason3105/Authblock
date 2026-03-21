'use client'

import React from 'react'
import { Container } from '@/components/ui'
import { CheckCircle } from 'lucide-react'

const backtestCards = [
  {
    label: 'Authblock Verified',
    value: '100,234',
    change: '+4.81%',
    changeColor: 'text-emerald-600',
    subtitle: 'Average across 50+ institutions',
    badge: { text: '100% verification rate', color: 'bg-emerald-500 text-white' },
    highlight: true,
  },
  {
    label: 'Manual Only (no blockchain)',
    value: '98,150',
    change: '+3.19% integrity',
    changeColor: 'text-emerald-600',
    subtitle: 'Base manual check only (no blockchain link)',
    badge: null,
    highlight: false,
  },
  {
    label: 'Worst case scenario',
    value: '97,500',
    change: '+0.26% integrity',
    changeColor: 'text-emerald-600',
    subtitle: 'Even the worst window was tamper-proof',
    badge: { text: '$0 fraud detected', color: 'bg-emerald-500 text-white' },
    highlight: false,
  },
]

export function Stats() {
  return (
    <section className="relative py-24 bg-slate-50">
      <Container>
        {/* Section Header */}
        <div className="text-center mb-12">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">BACKTEST PROOF</div>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-slate-900 tracking-tight">
            What would&apos;ve happened with real data
          </h2>
        </div>

        {/* Backtest Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {backtestCards.map((card) => (
            <div
              key={card.label}
              className={`rounded-2xl p-8 text-center transition-all duration-300 ${
                card.highlight
                  ? 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 shadow-lg'
                  : 'bg-white border border-slate-200 hover:border-blue-200 hover:shadow-md'
              }`}
            >
              <div className="text-xs font-medium text-blue-600 mb-3 uppercase tracking-wider">{card.label}</div>
              <div className="text-4xl md:text-5xl font-bold text-slate-900 mb-2">${card.value}</div>
              <div className={`text-sm font-semibold ${card.changeColor} mb-2`}>{card.change}</div>
              <div className="text-xs text-slate-500 mb-4">{card.subtitle}</div>
              {card.badge && (
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${card.badge.color}`}>
                  <CheckCircle className="w-3 h-3" />
                  {card.badge.text}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="text-center text-xs text-slate-400 max-w-3xl mx-auto">
          Data: Institutional verification records + blockchain hash validations (Ethereum, Polygon). March 2024 – March 2026. 552 rolling 6-month windows tested.
        </p>
      </Container>
    </section>
  )
}
