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

export function Navbar({ isLoggedIn = false, user = null }: { isLoggedIn?: boolean, user?: any }) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

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
          <div className="hidden lg:flex items-center gap-1">
            <span className="text-xs text-slate-400 font-medium tracking-wider mr-4">— NAVIGATION —</span>
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

          {/* CTA Button */}
          <div className="hidden lg:flex items-center">
            {user ? (
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3 border-r border-slate-200 pr-6">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                    {user.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-900 leading-tight">{user.full_name}</span>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">{user.prn_no}</span>
                  </div>
                </div>
                <a
                  href="/api/auth/logout"
                  className="text-sm font-semibold text-red-600 hover:text-red-700 flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </a>
              </div>
            ) : (
              <Link
                href={isLoggedIn ? "/dashboard" : "/login"}
                className="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-all duration-200 hover:shadow-lg hover:shadow-blue-600/25"
              >
                {isLoggedIn ? "Dashboard →" : "Login →"}
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-100 shadow-lg py-4">
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
              <div className="pt-3 mt-2 border-t border-slate-100">
                <Link
                  href={isLoggedIn ? "/dashboard" : "/login"}
                  className="block w-full text-center px-5 py-3 bg-blue-600 text-white text-sm font-semibold rounded-full hover:bg-blue-700 transition-colors"
                >
                  {isLoggedIn ? "Dashboard →" : "Login →"}
                </Link>
              </div>
            </div>
          </div>
        )}
      </Container>
    </nav>
  )
}
