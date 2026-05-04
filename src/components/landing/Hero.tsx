'use client'

import React, { useCallback, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui'
import { ArrowRight } from 'lucide-react'

/* ── Interactive grid background ────────────────────────────────── */
const CELL = 40 // grid cell size in px

function InteractiveGrid({ hoveredCell }: { hoveredCell: { col: number; row: number } | null }) {
  const cellX = hoveredCell ? hoveredCell.col * CELL : -9999
  const cellY = hoveredCell ? hoveredCell.row * CELL : -9999

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
      {/* Base grid lines */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(203, 213, 225, 0.5) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(203, 213, 225, 0.5) 1px, transparent 1px)',
          backgroundSize: `${CELL}px ${CELL}px`,
        }}
      />

      {/* Active cell glow — snaps to individual box */}
      {hoveredCell && (
        <div
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: cellX,
            top: cellY,
            width: CELL,
            height: CELL,
            background: 'rgba(191, 219, 254, 0.5)',
            boxShadow: '0 0 14px 3px rgba(96, 165, 250, 0.25)',
          }}
        />
      )}

      {/* Neighbouring cells — softer glow */}
      {hoveredCell &&
        [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]].map(([dc, dr]) => (
          <div
            key={`${dc},${dr}`}
            className="absolute transition-all duration-100 ease-out"
            style={{
              left: (hoveredCell.col + dc) * CELL,
              top: (hoveredCell.row + dr) * CELL,
              width: CELL,
              height: CELL,
              background: 'rgba(191, 219, 254, 0.18)',
            }}
          />
        ))}
    </div>
  )
}

/* ── tiny SVG sparkline (pure component) ────────────────────────── */
function MiniChart({ points, color = '#0066FF', height = 40 }: { points: number[]; color?: string; height?: number }) {
  const width = 120
  const max = Math.max(...points)
  const min = Math.min(...points)
  const range = max - min || 1
  const step = width / (points.length - 1)

  const pathD = points
    .map((p, i) => {
      const x = i * step
      const y = height - ((p - min) / range) * (height - 4) - 2
      return `${i === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')

  const areaD = `${pathD} L${width},${height} L0,${height} Z`

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
      <defs>
        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.15} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaD} fill={`url(#grad-${color.replace('#', '')})`} />
      <path d={pathD} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/* ── Credential mini-cards (below hero like PPN.FI market cards) ── */
const credentials = [
  {
    category: 'UNIVERSITY',
    name: 'B.Tech CS',
    count: '3,520',
    change: '+2.98%',
    up: true,
    points: [5, 8, 4, 9, 6, 11, 7, 13, 10, 14, 12, 15],
    color: '#0066FF',
  },
  {
    category: 'BOARD',
    name: 'Higher Secondary',
    count: '42',
    change: '+0.33%',
    up: true,
    points: [3, 5, 4, 6, 5, 7, 6, 4, 7, 5, 8, 6],
    color: '#0066FF',
  },
  {
    category: 'INSTITUTION',
    name: 'Diploma Eng.',
    count: '73',
    change: '+2.50%',
    up: true,
    points: [4, 3, 5, 7, 6, 4, 8, 5, 9, 7, 11, 8],
    color: '#0066FF',
  },
  {
    category: 'RESEARCH',
    name: 'PhD Thesis',
    count: '183',
    change: '+0.15%',
    up: true,
    points: [2, 4, 3, 6, 5, 8, 7, 9, 6, 10, 8, 12],
    color: '#0066FF',
  },
]

export function Hero({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  const sectionRef = useRef<HTMLElement>(null)
  const [hoveredCell, setHoveredCell] = useState<{ col: number; row: number } | null>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
    if (!sectionRef.current) return
    const rect = sectionRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setHoveredCell({ col: Math.floor(x / CELL), row: Math.floor(y / CELL) })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setHoveredCell(null)
  }, [])

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen flex items-center overflow-hidden pt-20 pb-12 lg:pt-36 lg:pb-32 bg-white"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Interactive grid background — pointer-events-none, receives cell from section */}
      <InteractiveGrid hoveredCell={hoveredCell} />
      <div className="absolute inset-0 bg-gradient-to-b from-white/80 via-transparent to-white/80" style={{ zIndex: 2 }} />

      <Container className="relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* ─── Left Content ─── */}
          <div className="max-w-2xl mx-auto lg:mx-0 text-center lg:text-left pt-6 lg:pt-0">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-50 border border-blue-200 rounded-full mb-6 lg:mb-10">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-xs font-semibold text-blue-700 tracking-wide uppercase">Blockchain Verified on Ethereum</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-3xl sm:text-5xl lg:text-[4rem] font-extrabold text-slate-900 leading-[1.15] mb-6 lg:mb-8 tracking-tight text-balance">
              Secure your academic{' '}
              <br className="hidden sm:block" />
              credentials without{' '}
              <br className="hidden sm:block" />
              <span className="text-slate-900">the risk.</span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-xl text-slate-600 mb-8 lg:mb-10 leading-relaxed max-w-xl mx-auto lg:mx-0 text-balance px-4 sm:px-0">
              Issue tamper-proof certificates. Pick a credential — degree, diploma, transcript.
              If it's verified, share it globally. If it's tampered, the blockchain catches it.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap justify-center lg:justify-start gap-3 lg:gap-4 mb-8 lg:mb-12 px-4 sm:px-0">
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="inline-flex items-center justify-center gap-2 px-6 lg:px-8 py-3.5 lg:py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all duration-300 hover:shadow-xl hover:shadow-blue-600/25 active:scale-95"
              >
                <Image src="/logo.png" alt="" width={20} height={20} className="w-5 h-5" />
                {isLoggedIn ? "Go to Dashboard" : "Get Started Now"}
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/verify"
                className="inline-flex items-center justify-center gap-2 px-6 lg:px-8 py-3.5 lg:py-4 bg-white text-slate-700 font-bold rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-slate-50 transition-all duration-300 active:scale-95 shadow-sm hover:shadow-md"
              >
                Verify Certificate
              </Link>
            </div>

            {/* Stats Banner */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 px-6 py-4 bg-slate-900 text-white rounded-2xl text-[13px] sm:text-sm font-medium shadow-xl shadow-slate-900/10 mx-4 sm:mx-0">
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-emerald-400 font-bold">1,234</span>
                <span className="text-slate-300">certificates issued</span>
              </div>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-slate-300">by</span>
                <span className="text-white font-bold">50+</span>
                <span className="text-slate-300">institutions</span>
              </div>
              <span className="text-slate-500 hidden lg:inline">|</span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-emerald-400 font-bold">$0 fraud</span>
                <span className="text-slate-300">— ever.</span>
              </div>
            </div>
          </div>

          {/* ─── Right Content — Terminal Dashboard ─── */}
          <div className="relative">
            <div className="terminal-card">
              {/* Terminal header bar */}
              <div className="terminal-header">
                <div className="flex items-center gap-2">
                  <div className="terminal-dot terminal-dot-red" />
                  <div className="terminal-dot terminal-dot-yellow" />
                  <div className="terminal-dot terminal-dot-green" />
                  <span className="text-xs text-slate-500 ml-3 font-medium">
                    authblock-terminal — Live Verification Feed
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">16:30:22 PM</span>
              </div>

              {/* Dashboard content */}
              <div className="p-5">
                {/* Top credential row */}
                <div className="flex items-center gap-2 mb-4">
                  <Image src="/logo.png" alt="" width={16} height={16} className="w-4 h-4" />
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">Certificates</span>
                  <span className="ml-auto text-xl font-bold text-slate-900">1,234</span>
                  <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">▲ 1.62%</span>
                </div>

                {/* Main Chart area */}
                <div className="mb-4 bg-slate-50 rounded-xl p-3">
                  <MiniChart
                    points={[20, 25, 22, 30, 28, 35, 32, 40, 38, 45, 42, 50, 48, 55, 52, 58, 55, 60]}
                    color="#0066FF"
                    height={80}
                  />
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Total</div>
                    <div className="text-sm font-bold text-blue-600">2.0M</div>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Verified</div>
                    <div className="text-sm font-bold text-slate-900">1.8M</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-0.5">Success Rate</div>
                    <div className="text-sm font-bold text-emerald-600">0.0045%</div>
                  </div>
                </div>

                {/* Terminal prompt */}
                <div className="bg-slate-900 rounded-lg px-3 py-2 font-mono text-xs text-slate-400">
                  <span className="text-emerald-400">{'>'}</span>{' '}
                  <span className="text-slate-300">verify.authblock</span>{' '}
                  <span className="text-blue-400">$</span>
                  <span className="animate-blink text-white ml-0.5">_</span>
                </div>
              </div>
            </div>

            {/* ─── Credential Mini Cards (2×2) ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              {credentials.map((cred) => (
                <div key={cred.name} className="mini-chart-card">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-wider">{cred.category}</span>
                    </div>
                    <span className={`text-[10px] font-semibold ${cred.up ? 'text-emerald-600' : 'text-red-500'}`}>
                      {cred.up ? '▲' : '▼'} {cred.change}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 mb-1">{cred.name}</div>
                  <div className="text-lg font-bold text-slate-900">{cred.count}</div>
                  <div className="mt-2 opacity-70">
                    <MiniChart points={cred.points} color={cred.color} height={28} />
                  </div>
                  <div className="text-[9px] text-blue-500 mt-1.5 font-medium">Blockchain verified credentials</div>
                </div>
              ))}
            </div>

            {/* Decorative Elements */}
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
            <div className="absolute -bottom-6 -left-6 w-40 h-40 bg-cyan-500/5 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="flex justify-center mt-16">
          <div className="animate-bounce-subtle">
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </Container>
    </section>
  )
}
