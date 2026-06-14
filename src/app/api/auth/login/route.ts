import { NextResponse } from 'next/server'
import { sql } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const { prn_no, full_name } = await req.json()

    if (!prn_no || !full_name) {
      return NextResponse.json({ error: 'PRN and Full Name are required' }, { status: 400 })
    }

    // Normalize and validate the entered name
    const enteredWords = full_name.trim().split(/\s+/).filter((w: string) => w.length > 0)

    if (enteredWords.length < 2) {
      return NextResponse.json({
        error: 'Please enter at least 2 words from your name (e.g., First and Last name)'
      }, { status: 400 })
    }

    const db = sql()

    // Fetch all users with matching PRN
    const candidates = await db`
      SELECT prn_no, full_name FROM users
      WHERE prn_no = ${prn_no}
    `

    if (candidates.length === 0) {
      return NextResponse.json({
        error: 'Could not find a matching student record. Please verify your PRN and Name.'
      }, { status: 401 })
    }

    // Find a match where all entered words exist in the stored full_name (case-insensitive)
    const matchedUser = candidates.find((user: any) => {
      const storedNameLower = user.full_name.toLowerCase()
      return enteredWords.every((word: string) =>
        storedNameLower.includes(word.toLowerCase())
      )
    })

    if (!matchedUser) {
      return NextResponse.json({
        error: 'Could not find a matching student record. Please verify your PRN and Name.'
      }, { status: 401 })
    }

    const user = matchedUser
    const sessionValue = JSON.stringify({ prn_no: user.prn_no, full_name: user.full_name })
    const isProduction = process.env.NODE_ENV === 'production'

    // Set cookie via NextResponse — compatible with Amplify Lambda
    const response = NextResponse.json({ success: true, user })
    response.cookies.set({
      name: 'student_session',
      value: sessionValue,
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    })

    return response
  } catch (error: any) {
    console.error('[Login API Error]:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
