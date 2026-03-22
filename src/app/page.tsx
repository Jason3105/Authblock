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
import { cookies } from 'next/headers'

export default function LandingPage() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('student_session')
  const isLoggedIn = !!sessionCookie
  const user = sessionCookie ? JSON.parse(sessionCookie.value) : null

  return (
    <main className="min-h-screen bg-white">
      <Navbar isLoggedIn={isLoggedIn} user={user} />
      <Hero isLoggedIn={isLoggedIn} />

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
      <CTA isLoggedIn={isLoggedIn} />

      {/* Footer */}
      <Footer />
    </main>
  )
}
