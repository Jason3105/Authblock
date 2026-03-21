import {
  Navbar,
  Hero,
  TickerBar,
  HowItWorks,
  Features,
  Stats,
  Stakeholders,
  CTA,
  Footer
} from '@/components/landing'

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />

      {/* Scrolling ticker */}
      <TickerBar />

      {/* How it works — 3 step cards */}
      <HowItWorks />

      {/* Subtle divider */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

      {/* Backtest / Stats section */}
      <Stats />

      {/* Features — 4 column grid */}
      <Features />

      {/* Credential cards — 3×2 */}
      <Stakeholders />

      {/* CTA */}
      <CTA />

      {/* Footer */}
      <Footer />
    </main>
  )
}
