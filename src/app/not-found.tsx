'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Navbar, Footer } from '@/components/landing'
import Link from 'next/link'
import { Home, ArrowLeft, Blocks, Hexagon, ShieldAlert } from 'lucide-react'

// Array of random floating symbols
const symbols = [Blocks, Hexagon, ShieldAlert]

export default function NotFound() {
  const [clickCount, setClickCount] = useState(0)
  const [mounted, setMounted] = useState(false)
  const isEasterEggactive = clickCount >= 5

  useEffect(() => {
    setMounted(true)
  }, [])

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      <Navbar />

      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12 sm:py-16 md:py-20 relative min-h-[calc(100vh-80px)]">

        {/* Decorative modern background gradients */}
        <div className="absolute top-1/4 left-1/4 w-[200px] h-[200px] md:w-[30vw] md:h-[30vw] md:min-w-[300px] bg-primary/10 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-[200px] h-[200px] md:w-[30vw] md:h-[30vw] md:min-w-[300px] bg-purple-500/10 rounded-full blur-[80px] md:blur-[100px] pointer-events-none" />

        {/* Floating background blocks */}
        {mounted && [...Array(6)].map((_, i) => {
          const Icon = symbols[i % symbols.length]
          // Random deterministic values for rendering based on index to avoid hydration errors
          const leftPos = typeof window !== 'undefined' ? Math.random() * window.innerWidth : (i * 150) % 1000;
          const topPos = typeof window !== 'undefined' ? Math.random() * window.innerHeight : (i * 200) % 800;
          return (
            <motion.div
              key={i}
              className="absolute hidden md:block text-slate-200/50 pointer-events-none"
              initial={{ 
                x: leftPos - 100,
                y: topPos - 100,
                rotate: (i * 45) % 360,
                scale: 1 + (i % 3) * 0.5
              }}
              animate={{ 
                y: [null, topPos - 200, topPos],
                rotate: [null, (i * 45) % 360 + 180],
              }}
              transition={{
                duration: 20 + i * 2,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear"
              }}
            >
              <Icon size={120} strokeWidth={1} />
            </motion.div>
          )
        })}

        <div className="z-10 text-center flex flex-col items-center max-w-4xl mx-auto w-full">
          <motion.div
            className="relative mb-6 sm:mb-8 md:mb-10 cursor-pointer group"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            onClick={() => setClickCount(c => c + 1)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {/* The Easter Egg Effect */}
            {isEasterEggactive && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-purple-500 via-primary to-emerald-500 blur-2xl opacity-50 rounded-full z-0"
                animate={{ rotate: 360 }}
                transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
              />
            )}

            <div className="relative z-10 flex items-center justify-center text-[80px] sm:text-[120px] md:text-[160px] lg:text-[180px] font-black tracking-tighter select-none leading-none">
              <motion.span
                className={`text-slate-900 ${isEasterEggactive ? 'bg-gradient-to-br from-purple-600 to-primary text-transparent bg-clip-text' : ''}`}
                animate={isEasterEggactive ? { y: [-10, 10, -10] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                4
              </motion.span>
              <motion.span
                className={`text-primary mx-2 sm:mx-3 md:mx-4 flex items-center justify-center ${isEasterEggactive ? 'drop-shadow-[0_0_15px_rgba(59,130,246,0.5)]' : ''}`}
                animate={isEasterEggactive ? { rotateY: 360 } : {}}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              >
                <Blocks className="w-16 h-16 sm:w-24 sm:h-24 md:w-32 md:h-32 lg:w-40 lg:h-40" strokeWidth={1.5} />
              </motion.span>
              <motion.span
                className={`text-slate-900 ${isEasterEggactive ? 'bg-gradient-to-br from-primary to-emerald-500 text-transparent bg-clip-text' : ''}`}
                animate={isEasterEggactive ? { y: [10, -10, 10] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              >
                4
              </motion.span>
            </div>
          </motion.div>

          {/* Easter egg helper tooltip */}
          {!isEasterEggactive && clickCount > 0 && clickCount < 5 && (
            <p className="text-xs sm:text-sm text-slate-400 font-medium mb-6 select-none">
              Keep clicking... ({5 - clickCount} more)
            </p>
          )}

          <AnimatePresence>
            {isEasterEggactive && (
              <motion.div
                initial={{ opacity: 0, y: -20, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -20, height: 0 }}
                className="bg-white/90 backdrop-blur border border-emerald-200 px-4 py-2 sm:px-6 sm:py-3 rounded-2xl shadow-xl shadow-emerald-500/10 mb-8"
              >
                <p className="text-sm sm:text-base text-emerald-600 font-bold flex items-center justify-center gap-2">
                  🎉 Level Unlocked: Master Block Explorer!
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.h2
            className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-800 mb-5 sm:mb-6 tracking-tight px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Block Not Found
          </motion.h2>

          <motion.p
            className="text-base sm:text-lg text-slate-500 max-w-lg mx-auto mb-10 sm:mb-12 leading-relaxed px-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            The page or credential you're looking for seems to have been dropped from the chain. Let's get you back to the genesis block.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full px-4 sm:w-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Link
              href="/"
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 md:py-4 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition shadow-lg shadow-blue-600/30 text-base"
            >
              <Home className="w-5 h-5" />
              Back to Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="flex items-center justify-center gap-2 px-6 sm:px-8 py-3 md:py-4 bg-white text-slate-700 border-2 border-slate-300 rounded-xl font-semibold hover:bg-slate-50 hover:border-slate-400 transition text-base"
            >
              <ArrowLeft className="w-5 h-5" />
              Go Back
            </button>
          </motion.div>
        </div>
      </div>

      <Footer />
    </main>
  )
}
