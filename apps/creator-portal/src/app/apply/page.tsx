import { redirect } from 'next/navigation'

/**
 * /apply redirects to /creator/join
 * This maintains backwards compatibility with any external links to /apply
 */
export default function ApplyPage() {
  redirect('/creator/join')
}
