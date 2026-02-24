/**
 * Contact Us Page
 *
 * Server component wrapper that exports metadata and renders
 * the interactive contact form client component.
 */

import type { Metadata } from 'next'
import { getTenantConfig } from '@/lib/tenant'
import { ContactForm } from './ContactForm'

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantConfig()
  const tenantName = tenant?.name ?? 'Store'

  return {
    title: `Contact Us | ${tenantName}`,
    description: `Get in touch with ${tenantName}. Send us a message and we'll get back to you as soon as possible.`,
  }
}

export default function ContactPage() {
  return <ContactForm />
}
