'use client'

import React from 'react'
import Link from 'next/link'
import { Container } from '@/components/ui'
import { ArrowRight } from 'lucide-react'

export function CTA({ isLoggedIn = false }: { isLoggedIn?: boolean }) {
  return (
    <section className="relative py-24 overflow-hidden bg-white">
      <Container className="relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          {/* Heading */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-6 text-slate-900 tracking-tight">
            Your credentials deserve to be verified — safely.
          </h2>

          {/* Description */}
          <p className="text-lg text-slate-600 mb-12 max-w-xl mx-auto leading-relaxed">
            Upload once. Get verified. Share globally. Get your full record back if tampered.
            On-chain, permissionless, built for the long run.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href={isLoggedIn ? "/dashboard" : "/login"}
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/25 hover:shadow-xl hover:shadow-blue-600/30"
            >
              {isLoggedIn ? "Dashboard" : "Login"}
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/verify"
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-slate-700 font-semibold rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all"
            >
              Verify Certificate
            </Link>
          </div>
        </div>

        {/* Decorative gradient bar */}
        <div className="mt-20 h-2 rounded-full bg-gradient-to-r from-blue-600 via-cyan-400 to-blue-600 max-w-4xl mx-auto opacity-30" />
      </Container>
    </section>
  )
}
