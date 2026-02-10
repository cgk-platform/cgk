/**
 * Send a magic link to the user's email
 */
export async function sendMagicLink(
  _email: string,
  _tenantId: string
): Promise<void> {
  // TODO: Implement magic link sending
  throw new Error('Not implemented')
}

/**
 * Verify a magic link token
 */
export async function verifyMagicLink(
  _token: string
): Promise<{ userId: string; tenantId: string }> {
  // TODO: Implement magic link verification
  throw new Error('Not implemented')
}
