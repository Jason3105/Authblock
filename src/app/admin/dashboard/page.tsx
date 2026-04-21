'use client'

import React, { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { FileText, Shield, Users, ArrowRight, Loader2 } from 'lucide-react'
import AdminShell, { type AdminRecord } from '@/components/admin/AdminShell'

function DashboardContent({ admin }: { admin: AdminRecord }) {
  const isSuperAdmin = admin.admin_type === 'superadmin'
  const [statsData, setStatsData] = useState({
    certificatesIssued: 0,
    verifiedOnChain: 0,
    adminUsers: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/dashboard-stats')
        const data = await res.json()
        if (data.success) {
          setStatsData(data.stats)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard stats:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [])

  const stats = [
    { label: 'Certificates Issued', value: statsData.certificatesIssued, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Verified On-Chain',   value: statsData.verifiedOnChain, icon: Shield,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Admin Users',         value: statsData.adminUsers, icon: Users,    color: 'text-purple-600', bg: 'bg-purple-50' },
  ]

  return (
    <div className="space-y-6 max-w-7xl mx-auto w-full">

      {/* ── Welcome Banner ── */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'radial-gradient(white 1px, transparent 1px)',
          backgroundSize: '20px 20px',
        }} />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm">
                 <Image src="/logo.png" alt="" width={24} height={24} />
               </div>
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-blue-200">Admin Portal</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mb-1">
              Welcome back, {admin.name.split(' ')[0]} 👋
            </h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              {admin.position ? `${admin.position} · ` : ''}
              <span className={`inline-flex items-center gap-1 font-semibold ${isSuperAdmin ? 'text-yellow-200' : 'text-blue-200'}`}>
                {isSuperAdmin ? '🛡 Superadmin' : '🔑 Admin'}
              </span>
            </p>
          </div>

          {/* Email chip */}
          <div className="shrink-0 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-sm">
            <div className="text-blue-200 text-[10px] uppercase font-bold tracking-wider mb-0.5">Signed in as</div>
            <div className="text-white font-medium truncate max-w-[200px]">{admin.email}</div>
          </div>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-4`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-bold text-slate-900 mb-0.5">
              {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-300" /> : stat.value}
            </div>
            <div className="text-sm text-slate-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Quick actions for superadmin ── */}
      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/admin/users"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-purple-600" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">Manage Admins</div>
                <div className="text-xs text-slate-400">Add or remove admin users</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 ml-auto shrink-0 transition-colors" />
            </Link>

            <Link
              href="/admin/marksheets"
              className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 hover:border-blue-200 hover:bg-blue-50/40 transition-all group"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-blue-500" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-800">Issue Marksheets</div>
                <div className="text-xs text-slate-400">Issue blockchain-anchored credentials</div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 ml-auto shrink-0 transition-colors" />
            </Link>
          </div>
        </div>
      )}

      {/* ── Additional Views ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link 
          href="/admin/marksheets"
          className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center gap-4 hover:border-blue-200 transition-colors group"
        >
          <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center shrink-0">
            <FileText className="w-7 h-7 text-blue-400 group-hover:text-blue-600 transition-colors" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Marksheet Management</h3>
            <p className="text-sm text-slate-500 max-w-xs">
              View and manage all blockchain-anchored marksheets issued by the college.
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}

export default function AdminDashboardPage() {
  return (
    <AdminShell>
      {(admin) => <DashboardContent admin={admin} />}
    </AdminShell>
  )
}
