import { isValidProfile, PROFILES } from '@cgk-platform/openclaw'
import { notFound } from 'next/navigation'

export async function generateMetadata({ params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params
  return {
    title: PROFILES[profile]?.label ?? profile,
  }
}

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ profile: string }>
}) {
  const { profile } = await params

  if (!isValidProfile(profile)) {
    notFound()
  }

  return <>{children}</>
}
