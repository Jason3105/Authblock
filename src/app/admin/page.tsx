import { redirect } from 'next/navigation'

// /admin → redirect to /admin/login
// Client-side auth guard is handled inside the login & dashboard pages
export default function AdminRoot() {
  redirect('/admin/login')
}
