'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui'

/* ── Mini chart SVG ──────────────────────────────────────────────── */
function MiniChart({ points, color = '#0066FF' }: { points: number[]; color?: string }) {
  const w = 100, h = 40
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = w / (points.length - 1)

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${i * step},${h - ((p - min) / range) * (h - 4) - 2}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.12} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={`url(#sg-${color.replace('#', '')})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/* ── Data ─────────────────────────────────────────────────────────── */
const credentials = [
  {
    badge: 'MOST POPULAR',
    badgeColor: 'bg-red-50 text-red-600 border border-red-200',
    category: 'UNIVERSITIES',
    name: 'B.Tech CS',
    value: '3,520',
    change: '2.98%',
    up: true,
    points: [5, 8, 6, 10, 7, 12, 9, 14, 11, 16, 13, 18],
  },
  {
    badge: null,
    badgeColor: '',
    category: 'BOARDS',
    name: 'Higher Secondary',
    value: '42',
    change: '0.33%',
    up: false,
    points: [4, 5, 3, 6, 4, 5, 6, 4, 7, 5, 6, 5],
  },
  {
    badge: null,
    badgeColor: '',
    category: 'INSTITUTIONS',
    name: 'Diploma Engineering',
    value: '73',
    change: '0.21%',
    up: false,
    points: [3, 5, 4, 6, 5, 4, 7, 5, 6, 4, 8, 6],
  },
  {
    badge: 'AUTHBLOCK EXCLUSIVE',
    badgeColor: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    category: 'RESEARCH',
    name: 'PhD Thesis Verification',
    value: '2,170',
    change: '3.07%',
    up: true,
    points: [2, 5, 3, 7, 5, 9, 6, 11, 8, 13, 10, 15],
  },
  {
    badge: null,
    badgeColor: '',
    category: 'PROFESSIONAL',
    name: 'MBA Finance',
    value: '191,457',
    change: '1.38%',
    up: false,
    points: [10, 12, 9, 14, 11, 13, 12, 10, 14, 11, 15, 12],
  },
  {
    badge: null,
    badgeColor: '',
    category: 'PROFESSIONAL',
    name: 'M.Sc Physics',
    value: '7,419',
    change: '0.90%',
    up: true,
    points: [3, 5, 4, 7, 5, 8, 6, 9, 7, 10, 8, 11],
  },
]

export function Stakeholders() {
  return (
    <section id="credentials" className="relative py-24 bg-white">
      <Container>
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <div className="text-xs font-bold text-blue-600 uppercase tracking-[0.2em] mb-3">CREDENTIALS</div>
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">
              Credentials you can verify
            </h2>
          </div>
          <Link
            href="#"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700 mt-4 md:mt-0"
          >
            Showing 6 of 22+ credential types · View all →
          </Link>
        </div>

        {/* Credential Cards - 3×2 Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {credentials.map((cred) => (
            <div key={cred.name} className="credential-card">
              {/* Top row: badge + category */}
              <div className="flex items-center gap-2 mb-3">
                {cred.badge && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${cred.badgeColor}`}>
                    {cred.badge}
                  </span>
                )}
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                  <span className="text-blue-400">●</span> {cred.category}
                </span>
              </div>

              {/* Name + Price */}
              <div className="flex items-start justify-between mb-1">
                <div>
                  <div className="font-bold text-slate-900">{cred.name}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{cred.value}</div>
                </div>
                <div className="w-24">
                  <MiniChart points={cred.points} color={cred.up ? '#0066FF' : '#ef4444'} />
                </div>
              </div>

              {/* Change indicator */}
              <div className={`text-xs font-semibold mb-5 ${cred.up ? 'text-emerald-600' : 'text-red-500'}`}>
                {cred.up ? '▲' : '▼'} {cred.change} 24h
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/verify"
                  className="text-center px-4 py-2.5 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:border-slate-300 hover:bg-slate-50 transition-all"
                >
                  Verify
                </Link>
                <Link
                  href="/login"
                  className="text-center px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-all"
                >
                  Issue
                </Link>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  )
}
