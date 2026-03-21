'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import { auth } from '@/lib/firebase'

type Status = 'idle' | 'loading' | 'denied' | 'error'

const GOOGLE_ICON = (
  <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
)

export default function AdminLoginPage() {
  const router  = useRouter()
  const [status, setStatus]      = useState<Status>('idle')
  const [errorMsg, setErrorMsg]  = useState('')
  const [deniedEmail, setDeniedEmail] = useState('')

  async function handleGoogleSignIn() {
    setStatus('loading')
    setErrorMsg('')
    setDeniedEmail('')

    let signedInEmail = ''
    let signedInUid   = ''

    try {
      /* ── 1. Open Google popup ── */
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      const cred = await signInWithPopup(auth, provider)

      signedInEmail = cred.user.email ?? ''
      signedInUid   = cred.user.uid

      /* ── 2. Check the signed-in email against the DB whitelist ── */
      const res  = await fetch('/api/admin/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signedInEmail.toLowerCase() }),
      })
      const data = await res.json()

      if (!data.allowed) {
        /* Not whitelisted — delete the Firebase user entirely so it never
           appears in the Firebase Console, then sign out locally. */
        try { await cred.user.delete() } catch { /* ignore — best effort */ }
        await auth.signOut()
        setDeniedEmail(signedInEmail)
        setStatus('denied')
        return
      }

      /* ── 3. Whitelist passed — persist Firebase UID to DB ── */
      await fetch('/api/admin/link-firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email:          signedInEmail.toLowerCase(),
          firebase_uid:   signedInUid,
          firebase_email: signedInEmail,
        }),
      })

      /* ── 4. Redirect to dashboard ── */
      router.push('/admin/dashboard')

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)

      /* User closed the popup — reset silently */
      if (
        msg.includes('popup-closed-by-user') ||
        msg.includes('cancelled-popup-request') ||
        msg.includes('user-cancelled')
      ) {
        setStatus('idle')
        return
      }

      /* Sign out on any other error to clean auth state */
      try { await auth.signOut() } catch { /* ignore */ }

      setErrorMsg(msg)
      setStatus('error')
    }
  }

  const isLoading = status === 'loading'

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 bg-white"
      style={{
        backgroundImage:
          'linear-gradient(to right, rgba(203,213,225,0.4) 1px, transparent 1px),' +
          'linear-gradient(to bottom, rgba(203,213,225,0.4) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }}
    >
      <div className="w-full max-w-sm">

        {/* ── Branding ── */}
        <div className="text-center mb-10">
          <div className="inline-flex flex-col items-center gap-3 mb-2">
            <div className="w-16 h-16 rounded-2xl bg-white border border-slate-200 shadow-md flex items-center justify-center">
              <Image src="/logo.png" alt="Authblock" width={40} height={40} />
            </div>
            <span className="text-2xl font-bold text-slate-900 tracking-tight">AUTHBLOCK</span>
          </div>
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-[0.2em] mt-1">Admin Portal</div>
        </div>

        {/* ── Card ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">

          {/* Card Header */}
          <div className="px-8 pt-8 pb-6 border-b border-slate-100">
            <h1 className="text-lg font-bold text-slate-900">Sign in to continue</h1>
            <p className="text-sm text-slate-500 mt-1">
              Use your authorized Google account to access the admin portal.
            </p>
          </div>

          {/* Card Body */}
          <div className="px-8 py-6 space-y-4">

            {/* ── Denied state ── */}
            {status === 'denied' && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-red-600 text-sm font-bold">✕</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-red-800">Access Denied</p>
                    <p className="text-xs text-red-600 mt-1 leading-relaxed">
                      <span className="font-mono font-semibold">{deniedEmail}</span> is not registered as an admin.
                      Contact your superadmin to request access.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Generic error ── */}
            {status === 'error' && (
              <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-orange-600 text-sm font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-orange-800">Something went wrong</p>
                    <p className="text-xs text-orange-600 mt-1 leading-relaxed">{errorMsg || 'Please try again.'}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Google Sign-in Button ── */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className={`
                w-full flex items-center justify-center gap-3 py-3.5 rounded-xl
                border font-semibold text-sm transition-all duration-200
                ${isLoading
                  ? 'bg-slate-50 border-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300 hover:shadow-md active:scale-[0.99]'
                }
              `}
            >
              {isLoading ? (
                <>
                  <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  Verifying access…
                </>
              ) : (
                <>
                  {GOOGLE_ICON}
                  Continue with Google
                </>
              )}
            </button>

            {/* Retry hint after denial */}
            {(status === 'denied' || status === 'error') && (
              <button
                onClick={() => setStatus('idle')}
                className="w-full text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
              >
                ← Try a different account
              </button>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <p className="text-center text-xs text-slate-400 mt-6 leading-relaxed">
          Access restricted to authorized administrators only.<br />
          Contact your superadmin to request access.
        </p>
      </div>
    </div>
  )
}
