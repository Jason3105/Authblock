'use client';

import QRCode from 'react-qr-code';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function QRDisplay({ token }: { token: string | null }) {
  if (!token) return <div className="w-48 h-48 bg-slate-200 animate-pulse rounded-lg" />;
  const value = `AUTHBLOCK_SECURE_QR:${token}`;
  
  return (
    <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 relative">
      <QRCode value={value} size={180} />
    </div>
  );
}

export function RegenerateQRButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleRegenerate = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/qr/generate', { method: 'POST' });
      if (res.ok) {
        // refresh the page to show new QR and scans
        router.refresh();
      }
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button 
      onClick={handleRegenerate}
      disabled={loading}
      className={`bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-all flex items-center gap-2 ${loading ? 'opacity-75 cursor-not-allowed' : ''}`}
    >
      {loading ? 'Regenerating...' : 'Regenerate QR Code'}
    </button>
  );
}
