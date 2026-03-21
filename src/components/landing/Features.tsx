'use client'

import React from 'react'
import { Container } from '@/components/ui'
import {
  TrendingUp,
  Shield,
  LayoutGrid,
  BarChart3,
  ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: TrendingUp,
    title: '22+ credential types',
    description: 'Issue or verify degrees, diplomas, transcripts, certificates. Blockchain-secured, updated live, verifiable globally.',
    link: 'View all credentials',
    href: '#credentials',
  },
  {
    icon: Shield,
    title: 'Your certificate stays secure',
    description: 'Upload a certificate, hash it on-chain. If it\'s valid, verify. If it\'s tampered, the chain catches it. Protected by math.',
    link: 'Start verifying',
    href: '/verify',
  },
  {
    icon: LayoutGrid,
    title: 'Issue certificates at scale',
    description: 'Upload certificates into the blockchain vault. Issue in bulk from every institution. Withdraw verification anytime.',
    link: 'Issue now',
    href: '/login',
  },
  {
    icon: BarChart3,
    title: 'Full transparency',
    description: 'Track every certificate, every verification, every hash recorded. Everything is on-chain and verifiable.',
    link: 'View dashboard',
    href: '/login',
  },
]

export function Features() {
  return (
    <section id="features" className="relative py-24 bg-white">
      {/* Subtle top border line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80%] h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent" />

      <Container>
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">FEATURES</div>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-slate-900 tracking-tight">
            Built for verification that keeps credentials safe
          </h2>
        </div>

        {/* Features Grid - 4 columns */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="group bg-white rounded-2xl p-7 border border-slate-200 hover:border-blue-200 transition-all duration-300 hover:shadow-lg flex flex-col"
            >
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center mb-5 transition-colors">
                <feature.icon className="w-5 h-5 text-slate-600 group-hover:text-blue-600 transition-colors" />
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 mb-3">
                {feature.title}
              </h3>

              {/* Description */}
              <p className="text-sm text-slate-600 leading-relaxed mb-6 flex-1">
                {feature.description}
              </p>

              {/* Link */}
              <a
                href={feature.href}
                className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 group-hover:gap-2 transition-all duration-200"
              >
                {feature.link}
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
