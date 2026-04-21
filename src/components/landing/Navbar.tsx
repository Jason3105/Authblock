'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Container } from '@/components/ui'
import { Menu, X, LogOut } from 'lucide-react'

const navLinks = [
  { name: 'FEATURES', href: '/#features', dot: '◆', dotColor: 'text-blue-500' },
  { name: 'HOW IT WORKS', href: '/#how-it-works', dot: '■', dotColor: 'text-slate-900' },
  { name: 'CREDENTIALS', href: '/#credentials', dot: '▲', dotColor: 'text-blue-500' },
  { name: 'SCAN QR', href: '/scan', dot: '●', dotColor: 'text-emerald-500' },
  { name: 'ABOUT', href: '/#about', dot: '◆', dotColor: 'text-blue-500' },
]

// Props kept for backward-compat but ignored — session is always self-fetched.
export function Navbar({ isLoggedIn: _isLoggedIn, user: _user }: { isLoggedIn?: boolean, user?: any }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [sessionLoaded, setSessionLoaded] = useState(false)

  // Fetch real session state from the HTTP-only cookie via API
  useEffect(() => {
    fetch('/api/auth/session')
      .then(r => r.json())
      .then(data => {
        setUser(data.loggedIn ? data.user : null)
        setSessionLoaded(true)
      })
      .catch(() => setSessionLoaded(true))
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const isLoggedIn = !!user

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/90 backdrop-blur-xl border-b border-slate-100 shadow-sm'
          : 'bg-white/70 backdrop-blur-sm'
      }`}
    >
      <Container>
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Authblock" width={32} height={32} className="w-8 h-8" />
            <span className="text-lg font-bold text-slate-900 tracking-tight">
              AUTHBLOCK
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden xl:flex items-center gap-1">
            <span className="hidden 2xl:inline text-xs text-slate-400 font-medium tracking-wider mr-4">— NAVIGATION —</span>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.href}
                className="group flex items-center gap-1.5 px-3 py-2 text-slate-500 hover:text-slate-900 transition-colors duration-200 text-xs font-semibold tracking-wider"
              >
                <span className={`${link.dotColor} text-[8px] group-hover:scale-125 transition-transform`}>{link.dot}</span>
                {link.name}
              </Link>
            ))}
          </div>

          {/* CTA / Auth Area */}
          <div className="hidden xl:flex items-center">
            {/* Show placeholder while session loads to avoid flash */}
            {!sessionLoaded ? (
              <div className="w-24 h-8 bg-slate-100 animate-pulse rounded-full" />
            ) : user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-3 border-r border-slate-200 pr-4 hover:opacity-80 transition-opacity group/user"
                >
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs group-hover/user:scale-105 transition-transform">
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 leading-tight group-hover/user:text-blue-600 transition-colors">{user.full_name}</span>
                    <span className="hidden 2xl:block text-[10px] font-mono text-slate-500 uppercase tracking-widest">{user.prn_no}</span>
                  </div>
                </Link>
                <a
                  href="/api/auth/logout"
                  className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-1 px-2 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </a>
              </div>
            ) : (
              <Link
                href="/login"
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25"
              >
                Login →
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="xl:hidden text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="xl:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-lg py-4">
            <div className="flex flex-col gap-1 px-4">
              {navLinks.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  className="flex items-center gap-2 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors py-3 px-4 rounded-lg text-sm font-medium"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className={`${link.dotColor} text-[8px]`}>{link.dot}</span>
                  {link.name}
                </Link>
              ))}
              <div className="pt-3 mt-2 border-t border-slate-100 flex flex-col gap-2">
                {!sessionLoaded ? null : user ? (
                  <>
                    <Link
                      href="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group/m-user"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                        {user.full_name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-slate-900 leading-tight group-hover/m-user:text-blue-600 transition-colors">{user.full_name}</p>
                        <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{user.prn_no}</p>
                      </div>
                      <div className="text-blue-600 text-xs font-bold font-mono">GO →</div>
                    </Link>
                    <a
                      href="/api/auth/logout"
                      className="block w-full text-center px-5 py-3 text-red-600 border border-red-200 text-sm font-semibold rounded-full hover:bg-red-50 transition-colors"
                    >
                      Sign Out
                    </a>
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="block w-full text-center px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-colors"
                  >
                    Login →
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </Container>
    </nav>
  )
}
