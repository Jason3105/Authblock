'use client'

import React from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { cn } from '@/lib/utils'

interface WalletButtonProps {
  className?: string
  showBalance?: boolean
}

export function WalletButton({ className, showBalance = false }: WalletButtonProps) {
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted
        const connected = ready && account && chain

        return (
          <div
            {...(!ready && {
              'aria-hidden': true,
              style: {
                opacity: 0,
                pointerEvents: 'none',
                userSelect: 'none',
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    className={cn(
                      'relative inline-flex items-center justify-center gap-2 px-6 py-3 font-semibold text-white rounded-xl transition-all duration-300',
                      'bg-gradient-to-r from-blue-600 to-blue-500 shadow-lg shadow-blue-500/25',
                      'hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-[0.98]',
                      'focus:outline-none focus:ring-2 focus:ring-blue-500/30',
                      className
                    )}
                  >
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M18 8V7.2C18 6.08 18 5.52 17.782 5.092C17.59 4.716 17.284 4.41 16.908 4.218C16.48 4 15.92 4 14.8 4H9.2C8.08 4 7.52 4 7.092 4.218C6.716 4.41 6.41 4.716 6.218 5.092C6 5.52 6 6.08 6 7.2V8M6 8H18M6 8H5.6C4.64 8 4 8.64 4 9.6V18.4C4 19.36 4.64 20 5.6 20H18.4C19.36 20 20 19.36 20 18.4V9.6C20 8.64 19.36 8 18.4 8H18M6 8V12"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="2" />
                    </svg>
                    Connect Wallet
                  </button>
                )
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    className={cn(
                      'inline-flex items-center gap-2 px-4 py-2 font-medium text-red-600 rounded-xl',
                      'bg-red-50 border border-red-200 hover:bg-red-100',
                      'transition-all duration-300',
                      className
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    Wrong Network
                  </button>
                )
              }

              return (
                <div className="flex items-center gap-2">
                  {/* Chain button */}
                  <button
                    onClick={openChainModal}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 transition-all duration-300"
                  >
                    {chain.hasIcon && (
                      <div
                        className="w-5 h-5 rounded-full overflow-hidden"
                        style={{ background: chain.iconBackground }}
                      >
                        {chain.iconUrl && (
                          <img
                            alt={chain.name ?? 'Chain icon'}
                            src={chain.iconUrl}
                            className="w-5 h-5"
                          />
                        )}
                      </div>
                    )}
                    <span className="text-sm font-medium text-slate-700">{chain.name}</span>
                  </button>

                  {/* Account button */}
                  <button
                    onClick={openAccountModal}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-xl',
                      'bg-blue-50 border border-blue-200 hover:bg-blue-100',
                      'transition-all duration-300',
                      className
                    )}
                  >
                    {showBalance && account.displayBalance && (
                      <span className="text-sm font-medium text-slate-600">
                        {account.displayBalance}
                      </span>
                    )}
                    <span className="text-sm font-semibold text-blue-600">
                      {account.displayName}
                    </span>
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </button>
                </div>
              )
            })()}
          </div>
        )
      }}
    </ConnectButton.Custom>
  )
}
