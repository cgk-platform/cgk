import { isValidProfile } from '@cgk-platform/openclaw'
import { notFound } from 'next/navigation'

const PROFILE_LABELS: Record<string, string> = {
  cgk: 'CGK Linens',
  rawdog: 'RAWDOG',
  vitahustle: 'VitaHustle',
}

export async function generateMetadata({ params }: { params: Promise<{ profile: string }> }) {
  const { profile } = await params
  return {
    title: PROFILE_LABELS[profile] || profile,
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
