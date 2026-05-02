'use client'

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { Users, Shield, UserPlus, Trash2, AlertCircle, Loader2 } from 'lucide-react'
import AdminShell, { type AdminRecord } from '@/components/admin/AdminShell'

function ManageAdminsContent({ currentUser }: { currentUser: AdminRecord }) {
  const [admins, setAdmins] = useState<AdminRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  /* ── Add Admin Form State ── */
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [addError, setAddError] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    position: '',
    admin_type: 'admin' as 'admin' | 'superadmin',
  })

  const isSuperAdmin = currentUser.admin_type === 'superadmin'

  useEffect(() => {
    if (isSuperAdmin) fetchAdmins()
  }, [isSuperAdmin])

  async function fetchAdmins() {
    try {
      const res = await fetch('/api/admin/users')
      const data = await res.json()
      if (data.admins) setAdmins(data.admins)
    } catch {
      setError('Failed to load administrators')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault()
    setAddError('')
    setIsSubmitting(true)

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Failed to add admin')

      setAdmins([data.admin, ...admins])
      setFormData({ name: '', email: '', phone: '', position: '', admin_type: 'admin' })
    } catch (err: unknown) {
      setAddError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Are you sure you want to revoke access for ${name}?`)) return

    try {
      const res = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) throw new Error('Delete failed')
      setAdmins(admins.filter(a => a.id !== id))
    } catch {
      alert('Failed to delete admin')
    }
  }

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center h-[80vh]">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 border border-red-100 shadow-sm">
          <Shield className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-slate-500 max-w-sm">
          Only superadmins can manage administrator accounts. You do not have permission to view this page.
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
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 tracking-tight">Administrators</h1>
          <p className="text-base text-slate-500 mt-2">
            Manage who has access to the Authblock Admin Portal.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ── Left Column: Add Admin Form ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="xl:col-span-1"
        >
          <div className="glass-card overflow-hidden sticky top-6">
            {/* Terminal-style Header */}
            <div className="terminal-header bg-slate-50">
              <div className="flex items-center gap-2">
                <div className="terminal-dot terminal-dot-red" />
                <div className="terminal-dot terminal-dot-yellow" />
                <div className="terminal-dot terminal-dot-green" />
              </div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                new_admin.sh
              </div>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 bg-white space-y-5">
              <div className="mb-2">
                <h3 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                  Grant Access
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  New users will automatically link their Google accounts on first login.
                </p>
              </div>

              {addError && (
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex items-start gap-2.5 p-3.5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{addError}</span>
                </motion.div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Full Name</label>
                  <input
                    type="text" required
                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="input font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Work Email (Required for Google Auth)</label>
                  <input
                    type="email" required
                    value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="input font-medium"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Phone No.</label>
                    <input
                      type="text"
                      value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })}
                      className="input font-medium"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Position</label>
                    <input
                      type="text"
                      value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })}
                      className="input font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Admin Level</label>
                  <select
                    value={formData.admin_type} onChange={e => setFormData({ ...formData, admin_type: e.target.value as any })}
                    className="input font-medium cursor-pointer"
                  >
                    <option value="admin">Admin</option>
                    <option value="superadmin">Superadmin</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3.5 mt-2 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserPlus className="w-5 h-5" />}
                {isSubmitting ? 'Adding...' : 'Authorise Admin'}
              </button>
            </form>
          </div>
        </motion.div>

        {/* ── Right Column: Admin List ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="xl:col-span-2"
        >
          <div className="glass-card overflow-hidden h-full flex flex-col">
            <div className="p-6 border-b border-slate-100 bg-white">
              <h3 className="text-lg font-bold text-slate-900 inline-flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Active Directory
              </h3>
            </div>

            <div className="flex-1 bg-slate-50/50 p-6 min-h-[400px]">
              {loading ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-600" />
                  <p className="font-medium animate-pulse">Syncing directory…</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-500 font-medium bg-red-50 rounded-xl border border-red-100">{error}</div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  <AnimatePresence>
                    {admins.map((admin, idx) => (
                      <motion.div
                        key={admin.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ delay: idx * 0.05 }}
                        className="bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-200 hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center gap-4"
                      >
                        {/* Avatar */}
                        <div className="shrink-0">
                          {admin.firebase_photo_url && admin.firebase_photo_url.trim() !== '' ? (
                            <img src={admin.firebase_photo_url} alt={admin.name} className="w-12 h-12 rounded-full shadow-sm object-cover shrink-0 bg-slate-200" referrerPolicy="no-referrer" />
                          ) : (
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-sm shrink-0 ${
                              admin.admin_type === 'superadmin' ? 'bg-gradient-to-br from-indigo-500 to-purple-600' : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                            }`}>
                              {admin.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-slate-900 text-base truncate">{admin.name}</h4>
                            {admin.admin_type === 'superadmin' ? (
                              <span className="badge bg-purple-100 text-purple-700 text-[10px] uppercase font-bold tracking-wider py-0.5">
                                Superadmin
                              </span>
                            ) : (
                              <span className="badge bg-blue-100 text-blue-700 text-[10px] uppercase font-bold tracking-wider py-0.5">
                                Admin
                              </span>
                            )}
                          </div>
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-xs text-slate-500">
                            <span className="font-mono text-slate-600">{admin.email}</span>
                            <span className="hidden sm:inline text-slate-300">•</span>
                            <span>{admin.position || 'No position'}</span>
                             {admin.phone && (
                               <>
                                 <span className="hidden sm:inline text-slate-300">•</span>
                                 <span>{admin.phone}</span>
                               </>
                             )}
                          </div>
                        </div>

                        {/* Status & Actions */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-slate-100">
                          {admin.firebase_uid ? (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              <span className="text-xs font-bold uppercase tracking-wider">Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-full border border-amber-100">
                              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              <span className="text-xs font-bold uppercase tracking-wider">Pending</span>
                            </div>
                          )}

                          {admin.id !== currentUser.id && (
                            <button
                              onClick={() => handleDelete(admin.id, admin.name)}
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 hover:border-red-100 border border-transparent transition-all"
                              title="Revoke Access"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                  
                  {admins.length === 0 && !loading && (
                    <div className="text-center py-12 text-slate-500 bg-white rounded-xl border border-slate-200 border-dashed">
                      No administrators found in directory.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}

export default function ManageAdminsPage() {
  return (
    <AdminShell>
      {(admin) => <ManageAdminsContent currentUser={admin} />}
    </AdminShell>
  )
}
