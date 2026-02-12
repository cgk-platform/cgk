/**
 * MCP Resource definition utilities
 */

import type { ResourceContents } from './types'

/**
 * Resource handler function type
 */
export type ResourceHandler = () => Promise<ResourceContents>

/**
 * Resource definition
 */
export interface ResourceDefinition {
  uri: string
  name: string
  description?: string
  mimeType?: string
  handler: ResourceHandler
}

/**
 * Define an MCP resource
 */
export function defineResource(definition: ResourceDefinition): ResourceDefinition {
  return definition
}

/**
 * Example resource definitions
 */
export const exampleResources = {
  platformConfig: defineResource({
    uri: 'cgk://config/platform',
    name: 'Platform Configuration',
    description: 'Current platform configuration',
    mimeType: 'application/json',
    async handler() {
      // TODO: Return actual config
      return {
        uri: 'cgk://config/platform',
        mimeType: 'application/json',
        text: JSON.stringify({
          brand: 'Example Brand',
          features: ['creators', 'attribution'],
        }, null, 2),
      }
    },
  }),

  tenantInfo: defineResource({
    uri: 'cgk://tenant/current',
    name: 'Current Tenant',
    description: 'Information about the current tenant',
    mimeType: 'application/json',
    async handler() {
      // TODO: Return actual tenant info
      return {
        uri: 'cgk://tenant/current',
        mimeType: 'application/json',
        text: JSON.stringify({
          id: 'tenant_example',
          slug: 'example',
          name: 'Example Tenant',
        }, null, 2),
      }
    },
  }),
}
