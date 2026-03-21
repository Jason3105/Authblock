'use client'

import React, { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  LayoutDashboard, FileText, Users, Settings, LogOut, Menu, X, ChevronRight, ActivitySquare
} from 'lucide-react'

export interface AdminRecord {
  id: string
  name: string
  email: string
  phone: string | null
  position: string | null
  admin_type: 'superadmin' | 'admin'
  firebase_uid: string | null
  firebase_photo_url: string | null
  created_at: string
}

interface AdminShellProps {
  children: (admin: AdminRecord) => React.ReactNode
}

export default function AdminShell({ children }: AdminShellProps) {
  const router   = useRouter()
  const pathname = usePathname()

  const [admin, setAdmin]     = useState<AdminRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const fetchAdmin = useCallback(async (email: string) => {
    const res  = await fetch(`/api/admin/me?email=${encodeURIComponent(email)}`)
    const data = await res.json()
    if (data.admin) setAdmin(data.admin)
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) { router.replace('/admin/login'); return }
      await fetchAdmin(user.email!)
      setLoading(false)
    })
    return () => unsub()
  }, [router, fetchAdmin])

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/admin/login')
  }

  if (loading || !admin) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading…</span>
        </div>
      </div>
    )
  }

  const isSuperAdmin = admin.admin_type === 'superadmin'

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard',    href: '/admin/dashboard', always: true },
    { icon: FileText,        label: 'Marksheets',   href: '/admin/marksheets',always: true, soon: false },
    { icon: Users,           label: 'Manage Admins', href: '/admin/users',    always: false, superOnly: true },
    { icon: ActivitySquare,  label: 'Network Status', href: '/admin/network',  always: false, superOnly: true },
    { icon: Settings,        label: 'Settings',     href: '/admin/settings',  always: true, soon: true },
  ]

  const visibleNav = navItems.filter(n => n.always || (n.superOnly && isSuperAdmin))

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-100 shrink-0">
        <Image src="/logo.png" alt="Authblock" width={26} height={26} />
        <span className="text-base font-bold text-slate-900 tracking-tight">AUTHBLOCK</span>
        {/* Close button on mobile */}
        <button
          className="ml-auto lg:hidden text-slate-400 hover:text-slate-700"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.label}
              href={item.soon ? '#' : item.href}
              onClick={() => setSidebarOpen(false)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                ${item.soon
                  ? 'text-slate-400 cursor-not-allowed'
                  : isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }
              `}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {item.soon && (
                <span className="text-[9px] font-bold bg-slate-100 text-slate-400 px-2 py-0.5 rounded-full">
                  SOON
                </span>
              )}
              {!item.soon && isActive && <ChevronRight className="w-3.5 h-3.5 text-blue-400" />}
            </Link>
          )
        })}
      </nav>

      {/* User info footer */}
      <div className="px-4 py-4 border-t border-slate-100 shrink-0">
        <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-slate-50 border border-slate-200/60 shadow-sm">
          {admin.firebase_photo_url && admin.firebase_photo_url.trim() !== '' ? (
            <img src={admin.firebase_photo_url} alt={admin.name} className="w-9 h-9 rounded-full shrink-0 shadow-sm object-cover bg-slate-200" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shrink-0 shadow-sm">
              {admin.name[0].toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs font-bold text-slate-800 truncate">{admin.name}</div>
            <div className="text-[10px] font-semibold uppercase tracking-wider mt-0.5">
              {isSuperAdmin
                ? <span className="text-blue-600">🛡 Superadmin</span>
                : <span className="text-slate-400">🔑 Admin</span>
              }
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-red-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 rounded-xl transition-all font-medium"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* ─── Mobile sidebar overlay ─── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ─── Sidebar ─── */}
      <aside className={`
        fixed top-0 left-0 h-full z-30 flex flex-col bg-white border-r border-slate-200 w-64 transition-transform duration-300
        lg:static lg:translate-x-0 lg:shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <SidebarContent />
      </aside>

      {/* ─── Main ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="h-14 bg-white border-b border-slate-200 flex items-center px-4 gap-3 shrink-0">
          {/* Hamburger (mobile) */}
          <button
            className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex-1 min-w-0">
            <span className="text-sm font-bold text-slate-900 capitalize">
              {pathname.split('/').pop()?.replace('-', ' ') || 'Dashboard'}
            </span>
          </div>

          {/* Admin pill (topbar) */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-full shadow-sm hover:shadow-md transition-shadow">
            {admin.firebase_photo_url && admin.firebase_photo_url.trim() !== '' ? (
               <img src={admin.firebase_photo_url} alt={admin.name} className="w-5 h-5 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-[10px] shrink-0">
                {admin.name[0].toUpperCase()}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-700">{admin.name}</span>
            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
              isSuperAdmin ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
            }`}>
              {admin.admin_type}
            </span>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8">
          {children(admin)}
        </main>
      </div>
    </div>
  )
}
