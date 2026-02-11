import type { TenantConfig } from './tenant'

export function generateThemeCSS(config: TenantConfig): string {
  const { colors } = config

  return `
    :root {
      --primary: ${colors.primary};
      --secondary: ${colors.secondary};
      --accent: ${colors.accent};
    }
  `.trim()
}
