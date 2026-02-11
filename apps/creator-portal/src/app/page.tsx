import { redirect } from 'next/navigation'

export default function Home(): never {
  // Redirect to dashboard (auth will redirect to login if needed)
  redirect('/dashboard')
}
