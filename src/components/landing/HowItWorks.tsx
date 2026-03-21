'use client'

import React from 'react'
import { Container } from '@/components/ui'
import { Upload, QrCode, CheckCircle } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Upload,
    iconBg: 'bg-blue-100 text-blue-600',
    title: 'Upload Certificate',
    description: 'Upload your certificate data. Blockchain registration starts immediately — we handle the hashing and verification automatically.',
    highlights: ['Upload', 'Blockchain registration'],
  },
  {
    number: 2,
    icon: QrCode,
    iconBg: 'bg-emerald-100 text-emerald-600',
    title: 'Pick a verification method',
    description: 'QR code, hash lookup, or API — choose any method. Your certificate tracks its blockchain record. You don\'t need anything extra.',
    highlights: ['QR code', 'hash lookup', 'API'],
  },
  {
    number: 3,
    icon: CheckCircle,
    iconBg: 'bg-emerald-100 text-emerald-600',
    title: 'Share with confidence',
    description: 'Certificate verified? Share it anywhere. Tamper attempt? The blockchain catches it instantly. That\'s the shield.',
    highlights: ['Share it anywhere', 'blockchain catches it'],
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 bg-white">
      <Container>
        {/* Section Header */}
        <div className="text-center mb-16">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-4">HOW IT WORKS</div>
          <h2 className="text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-slate-900 tracking-tight">
            Three steps to verified credentials
          </h2>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {steps.map((step) => (
            <div
              key={step.number}
              className="group relative bg-white rounded-2xl p-8 border border-slate-200 hover:border-blue-200 transition-all duration-300 hover:shadow-lg"
            >
              {/* Number */}
              <div className="text-6xl font-bold text-slate-100 mb-4 leading-none">{step.number}</div>

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl ${step.iconBg} flex items-center justify-center mb-5`}>
                <step.icon className="w-5 h-5" />
              </div>

              {/* Content */}
              <h3 className="text-lg font-bold text-slate-900 mb-3">
                {step.title}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
