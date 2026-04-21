import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = cookies()
  const sessionCookie = cookieStore.get('student_session')

  if (!sessionCookie?.value) {
    return NextResponse.json({ loggedIn: false, user: null })
  }

  try {
    const user = JSON.parse(sessionCookie.value)
    return NextResponse.json({ loggedIn: true, user })
  } catch {
    return NextResponse.json({ loggedIn: false, user: null })
  }
}
