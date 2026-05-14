import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  title: 'Authblock - Blockchain Certificate Verification',
  description: 'Secure, tamper-proof academic credential verification powered by blockchain technology. Verify certificates instantly.',
  keywords: ['blockchain', 'certificate verification', 'academic credentials', 'ethereum', 'education', 'FRCRCE'],
  authors: [{ name: 'Authblock Team' }],
  icons: {
    icon: '/logo.png',
    shortcut: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'Authblock - Blockchain Certificate Verification',
    description: 'Secure, tamper-proof academic credential verification powered by blockchain technology.',
    type: 'website',
    images: ['/home.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Authblock - Blockchain Certificate Verification',
    description: 'Secure, tamper-proof academic credential verification powered by blockchain technology.',
    images: ['/home.png'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-white antialiased">
        {children}
      </body>
    </html>
  )
}
