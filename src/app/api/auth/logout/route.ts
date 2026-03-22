import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  cookies().delete('student_session')

  // Get the origin from the request URL
  const url = new URL(request.url)
  const redirectUrl = new URL('/', url.origin)

  return NextResponse.redirect(redirectUrl)
}
