import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CGK MCP Server',
  description: 'Model Context Protocol server for CGK Commerce Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: '2rem' }}>
        {children}
      </body>
    </html>
  )
}
