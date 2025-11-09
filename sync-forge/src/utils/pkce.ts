/**
 * PKCE (Proof Key for Code Exchange) - OAuth 2.0 security extension
 * 
 * Prevents authorization code interception by using a cryptographic challenge.
 * The client generates a random verifier, sends its hash during authorization,
 * then proves ownership by revealing the verifier when exchanging for tokens.
 */

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return base64UrlEncode(array)
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return base64UrlEncode(new Uint8Array(hash))
}

function base64UrlEncode(array: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...array))
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}