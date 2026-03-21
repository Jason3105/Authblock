'use client'

import React, { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, LineChart, Line, Legend
} from 'recharts'
import { Activity, Zap, Server, RefreshCw } from 'lucide-react'

interface BlockData {
  blockNumber: number
  timestamp: number
  gasUsed: number
  gasLimit: number
  baseFeeGwei: number
  txCount: number
}

export default function NetworkChart() {
  const [data, setData] = useState<BlockData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'gas' | 'txs' | 'fee'>('gas')
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date())

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/admin/network-stats')
      if (!res.ok) throw new Error('Failed to load')
      const json = await res.json()
      if (json.blocks) {
        setData(json.blocks)
        setLastRefreshed(new Date())
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    // Auto-refresh every 12 seconds
    const interval = setInterval(fetchData, 12000)
    return () => clearInterval(interval)
  }, [])

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl border border-red-100">
        <div className="text-center">
          <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="font-semibold">RPC Connection Failed</p>
          <p className="text-xs mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // Calculate some aggregates
  const avgGas = data.length > 0 ? data.reduce((acc, b) => acc + b.gasUsed, 0) / data.length : 0
  const avgTxs = data.length > 0 ? data.reduce((acc, b) => acc + b.txCount, 0) / data.length : 0
  const currentBlock = data.length > 0 ? data[data.length - 1].blockNumber : 0

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-800 flex items-center gap-2">
            <Server className="w-5 h-5 text-blue-500" />
            Live Network Metrics
          </h3>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
            <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Sepolia
            </span>
            <span>Current Block: {currentBlock || '...'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
          <button
            onClick={() => setActiveTab('gas')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'gas' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Gas Usage
          </button>
          <button
            onClick={() => setActiveTab('txs')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'txs' ? 'bg-white shadow-sm text-purple-600' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('fee')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${activeTab === 'fee' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:bg-slate-100'}`}
          >
            Base Fee
          </button>
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-6 relative">
        {loading && data.length === 0 && (
          <div className="absolute inset-0 z-10 bg-white/50 backdrop-blur-sm flex items-center justify-center">
             <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
          </div>
        )}
        
        <div className="h-64 w-full">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              {activeTab === 'gas' ? (
                <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="blockNumber" 
                    tickFormatter={(val) => `#${val.toString().slice(-4)}`} 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickMargin={10}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis hide domain={['dataMin - 100000', 'dataMax + 500000']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 600 }}
                    formatter={(value: any) => {
                      const num = typeof value === 'number' ? value : 0;
                      return [`${(num / 1e6).toFixed(2)}M Gas`, 'Gas Used'];
                    }}
                    labelFormatter={(label) => `Block ${label}`}
                  />
                  <Area type="monotone" dataKey="gasUsed" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorGas)" />
                </AreaChart>
              ) : activeTab === 'txs' ? (
                <AreaChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTxs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="blockNumber" tickFormatter={(val) => `#${val.toString().slice(-4)}`} stroke="#94a3b8" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis hide domain={[0, 'auto']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 600 }}
                    formatter={(value: any) => [`${value} Txs`, 'Transactions']}
                    labelFormatter={(label) => `Block ${label}`}
                  />
                  <Area type="step" dataKey="txCount" stroke="#a855f7" strokeWidth={2} fillOpacity={1} fill="url(#colorTxs)" />
                </AreaChart>
              ) : (
                <LineChart data={data} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="blockNumber" tickFormatter={(val) => `#${val.toString().slice(-4)}`} stroke="#94a3b8" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                  <YAxis domain={['auto', 'auto']} stroke="#94a3b8" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(val) => `${val.toFixed(2)}`} width={40} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: '12px', fontWeight: 600 }}
                    formatter={(value: any) => {
                      const num = typeof value === 'number' ? value : 0;
                      return [`${num.toFixed(4)} Gwei`, 'Base Fee'];
                    }}
                    labelFormatter={(label) => `Block ${label}`}
                  />
                  <Line type="monotone" dataKey="baseFeeGwei" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3, fill: '#f59e0b' }} activeDot={{ r: 5 }} />
                </LineChart>
              )}
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-300">
              Fetching metrics from Alchemy...
            </div>
          )}
        </div>
      </div>

      {/* Footer Stats summary */}
      <div className="bg-slate-50 border-t border-slate-100 p-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center divide-x divide-slate-200/60">
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Avg Gas / Block</div>
          <div className="text-sm font-bold text-blue-600">{(avgGas / 1e6).toFixed(2)}M</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Avg Txs / Block</div>
          <div className="text-sm font-bold text-purple-600">{Math.round(avgTxs)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Data Window</div>
          <div className="text-sm font-bold text-slate-700">{data.length} Blocks</div>
        </div>
        <div>
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mb-1">Last Updated</div>
          <div className="text-sm font-bold text-slate-700 flex items-center justify-center gap-1.5">
            {lastRefreshed.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            {loading && <RefreshCw className="w-3 h-3 animate-spin text-slate-400" />}
          </div>
        </div>
      </div>
    </div>
  )
}
