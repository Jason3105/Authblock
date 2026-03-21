'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { Shield, FileText, Users, Settings, LogOut, Clock } from 'lucide-react'

export default function AdminDashboard() {
  const router = useRouter()
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user) {
        router.replace('/admin/login')
      } else {
        setUserEmail(user.email)
        setLoading(false)
      }
    })
    return () => unsub()
  }, [router])

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/admin/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">Loading dashboard…</span>
        </div>
      </div>
    )
  }

  const navItems = [
    { icon: FileText, label: 'Certificates', href: '#', badge: 'Coming Soon' },
    { icon: Users, label: 'Admins', href: '#', badge: 'Coming Soon' },
    { icon: Settings, label: 'Settings', href: '#', badge: 'Coming Soon' },
  ]

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* ─── Sidebar ─── */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-6 h-16 border-b border-slate-100">
          <Image src="/logo.png" alt="Authblock" width={28} height={28} />
          <span className="text-base font-bold text-slate-900 tracking-tight">AUTHBLOCK</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 cursor-not-allowed opacity-60"
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="text-sm font-medium flex-1">{item.label}</span>
              <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {item.badge}
              </span>
            </div>
          ))}
        </nav>

        {/* User footer */}
        <div className="px-4 py-4 border-t border-slate-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
              {userEmail?.[0]?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-700 truncate">{userEmail}</div>
              <div className="text-[10px] text-slate-400">Administrator</div>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ─── Main Content ─── */}
      <main className="flex-1 overflow-auto">
        {/* Topbar */}
        <div className="h-16 bg-white border-b border-slate-200 flex items-center px-8 gap-4">
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-900">Dashboard</h1>
          </div>
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </div>
        </div>

        {/* Body */}
        <div className="p-8">
          {/* Welcome banner */}
          <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-3">
                <Image src="/logo.png" alt="" width={32} height={32} className="opacity-90" />
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Admin Portal</span>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                Welcome back 👋
              </h2>
              <p className="text-blue-100 text-sm">
                You are signed in as <strong>{userEmail}</strong>.
                The certificate issuance module is coming soon.
              </p>
            </div>
          </div>

          {/* Placeholder stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
            {[
              { label: 'Certificates Issued', value: '—', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Verified On-Chain', value: '—', icon: Shield, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Admin Users', value: '—', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div className="text-2xl font-bold text-slate-900 mb-1">{stat.value}</div>
                <div className="text-sm text-slate-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Coming soon notice */}
          <div className="bg-white rounded-2xl border border-slate-200 border-dashed p-12 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-blue-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Certificate Management</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              Issue, revoke, and verify blockchain-anchored academic certificates.
              This module is under development.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
