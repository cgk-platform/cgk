import { headers } from 'next/headers'

import { VoiceConfigView } from './voice-config-view'
import { getVoiceConfig } from '@/lib/bri/db'

export const metadata = {
  title: 'Voice - Bri',
  description: 'Configure voice, TTS, and STT settings',
}

export default async function VoicePage() {
  const headerList = await headers()
  const tenantSlug = headerList.get('x-tenant-slug')

  if (!tenantSlug) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <h2 className="text-lg font-medium">Tenant not found</h2>
          <p className="text-muted-foreground mt-2">Please select a tenant to continue.</p>
        </div>
      </div>
    )
  }

  const voiceConfig = await getVoiceConfig(tenantSlug)

  return <VoiceConfigView tenantSlug={tenantSlug} initialConfig={voiceConfig} />
}
