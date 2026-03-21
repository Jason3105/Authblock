'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { Shield, ActivitySquare, Server, Link as LinkIcon, ExternalLink } from 'lucide-react'
import AdminShell, { type AdminRecord } from '@/components/admin/AdminShell'
import NetworkChart from '@/components/admin/NetworkChart'

function NetworkPageContent({ currentUser }: { currentUser: AdminRecord }) {
  const isSuperAdmin = currentUser.admin_type === 'superadmin'

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[80vh]">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500 max-w-sm">
          Only superadmins can view live network metrics and node connection details.
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 w-full">

      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
            <ActivitySquare className="w-8 h-8 text-blue-600" />
            Network Status
          </h1>
          <p className="text-base text-slate-500 mt-2">
            Monitor real-time infrastructure and blockchain connection health.
          </p>
        </div>
      </motion.div>

      {/* ── Connection Details ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="glass-card p-6 flex flex-col md:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
            <Server className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Provider</div>
            <div className="text-lg font-bold text-slate-900">Alchemy</div>
            <a href="https://dashboard.alchemy.com/apps" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-600 mt-1 inline-flex items-center gap-1 font-medium transition-colors">
              App Metrics <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col md:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 border border-emerald-100/50">
            <LinkIcon className="w-6 h-6 text-emerald-600" />
          </div>
          <div className="flex-1">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Network</div>
            <div className="text-lg font-bold text-slate-900 flex items-center gap-2">
              Ethereum Sepolia
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100/50 text-[10px] uppercase">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live
              </div>
            </div>
            <a href="https://sepolia.etherscan.io" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-500 hover:text-blue-600 mt-1 inline-flex items-center gap-1 font-medium transition-colors">
              View on Etherscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="glass-card p-6 flex flex-col md:flex-row items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0 border border-purple-100/50">
            <Shield className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">Security</div>
            <div className="text-lg font-bold text-slate-900">API Key</div>
            <div className="text-sm text-slate-500 mt-0.5 w-full truncate max-w-[150px]">
              Secured on Backend
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Network Chart ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <NetworkChart />
      </motion.div>

    </div>
  )
}

export default function NetworkPage() {
  return (
    <AdminShell>
      {(admin) => <NetworkPageContent currentUser={admin} />}
    </AdminShell>
  )
}
