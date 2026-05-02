'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, ArrowRight, ShieldCheck, GraduationCap, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { Navbar } from '@/components/landing'

export default function LoginPage() {
  const router = useRouter()
  const [prn, setPrn] = useState('')
  const [fullName, setFullName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prn_no: prn.trim(), full_name: fullName.trim() })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to login')
      }

      // Route to dashboard on successful login
      router.push('/dashboard')
      
    } catch (err: any) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  return (
    <>
      <Navbar isLoggedIn={false} />
      <div className="min-h-screen flex selection:bg-blue-500/30 bg-slate-50 relative overflow-hidden pt-20">
      {/* Decorative Background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-400/20 blur-[120px] rounded-full mix-blend-multiply pointer-events-none" />
      
      {/* Interactive Grid snippet (re-used styling) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-40 z-0"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(203, 213, 225, 0.4) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(203, 213, 225, 0.4) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="w-full max-w-5xl mx-auto flex z-10 p-4 sm:p-6 lg:p-8 relative">
        {/* Left Side: Login Form */}
        <div className="w-full lg:w-1/2 flex flex-col justify-center">
          <Link href="/" className="flex items-center gap-2.5 mb-10 sm:mb-16 hover:opacity-80 transition-opacity w-fit">
            <Image src="/logo.png" alt="Authblock" width={32} height={32} className="w-8 h-8" />
            <span className="text-xl font-bold text-slate-900 tracking-tight">AUTHBLOCK</span>
          </Link>

          <div className="max-w-md">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 mb-4 tracking-tight">
              Student Portal
            </h1>
            <p className="text-lg text-slate-600 mb-10 leading-relaxed">
              Access your cryptographically secured academic credentials instantly.
            </p>

            <form onSubmit={handleLogin} className="space-y-6">
              
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, scale: 0.95 }}
                    animate={{ opacity: 1, height: 'auto', scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.95 }}
                    className="p-4 bg-red-50 text-red-700 text-sm font-semibold rounded-xl border border-red-100 flex items-start gap-3"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                <label htmlFor="prn" className="text-xs font-bold uppercase tracking-widest text-inherit ml-1">
                  PRN Number
                </label>
                <div className="relative">
                  <input
                    id="prn"
                    type="text"
                    required
                    value={prn}
                    onChange={(e) => setPrn(e.target.value)}
                    className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl outline-none transition-all font-semibold text-slate-800 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                  />
                  <HashIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                </div>
              </div>

              <div className="space-y-1.5 focus-within:text-blue-600 transition-colors">
                <label htmlFor="fullName" className="text-xs font-bold uppercase tracking-widest text-inherit ml-1">
                  Full Name
                </label>
                <div className="relative">
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-5 py-4 bg-white border-2 border-slate-200 focus:border-blue-500 rounded-2xl outline-none transition-all font-semibold text-slate-800 focus:ring-4 focus:ring-blue-500/10 shadow-sm"
                  />
                  <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 w-5 h-5" />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-between px-6 py-4 bg-slate-900 border border-transparent hover:border-slate-700 text-white font-semibold rounded-2xl transition-all hover:bg-slate-800 active:scale-[0.98] shadow-xl shadow-slate-900/10 group mt-4 disabled:opacity-80 disabled:pointer-events-none"
              >
                <span className="text-lg">{isLoading ? 'Authenticating...' : 'View Credentials'}</span>
                <div className="bg-white/10 p-2 rounded-xl group-hover:bg-white/20 transition-colors group-active:scale-95">
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-5 h-5" />}
                </div>
              </button>
            </form>

            <div className="mt-8 text-center sm:text-left">
              <Link href="/verify" className="text-sm font-semibold text-slate-500 hover:text-blue-600 transition-colors flex items-center justify-center sm:justify-start gap-2">
                <ShieldCheck className="w-4 h-4" /> Guest Identity? Verify a Document Instead
              </Link>
            </div>
          </div>
        </div>

        {/* Right Side: Informational Banner / Aesthetic */}
        <div className="hidden lg:flex w-1/2 items-center justify-center p-12">
          <div className="w-full h-full relative border border-white/50 bg-white/40 backdrop-blur-3xl shadow-2xl shadow-blue-900/5 rounded-[3rem] p-12 flex flex-col justify-between overflow-hidden">
            <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full mix-blend-multiply filter blur-[80px] opacity-40" />
            
            <div>
              <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-600/30 mb-8 border border-white/20">
                <GraduationCap className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-4xl font-extrabold text-slate-900 leading-tight tracking-tight mb-4">
                Your Academic<br />Identity, <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">On-Chain.</span>
              </h2>
              <p className="text-lg text-slate-600 leading-relaxed max-w-sm font-medium">
                Authblock ties all your credentials back to a single, cryptographic anchor ensuring tamper-proof verifiability across the globe.
              </p>
            </div>

            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 relative z-10">
              <div className="flex items-center gap-4 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Blockchain Verified</h4>
                  <p className="text-xs text-slate-500 font-medium">Sepolia Ethereum Network</p>
                </div>
              </div>
              <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[100%] rounded-full" />
              </div>
            </div>
            
          </div>
        </div>
      </div>
      </div>
    </>
  )
}

function HashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
    </svg>
  )
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}
