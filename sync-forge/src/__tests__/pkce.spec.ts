import { describe, it, expect } from 'vitest'
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/pkce'

describe('PKCE utilities', () => {
  describe('generateCodeVerifier', () => {
    it('generates a base64url-encoded string', () => {
      const verifier = generateCodeVerifier()
      
      expect(verifier).toBeTruthy()
      expect(typeof verifier).toBe('string')
      expect(verifier.length).toBeGreaterThan(0)
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/) // only base64url characters
    })

    it('generates different values on each call', () => {
      const verifier1 = generateCodeVerifier()
      const verifier2 = generateCodeVerifier()
      
      expect(verifier1).not.toBe(verifier2)
    })

    it('generates verifier with correct length (43 chars for 32 bytes)', () => {
      const verifier = generateCodeVerifier()
      
      expect(verifier.length).toBe(43)
    })

    it('does not contain base64 padding or special chars', () => {
      const verifier = generateCodeVerifier()
      
      expect(verifier).not.toContain('=')
      expect(verifier).not.toContain('+')
      expect(verifier).not.toContain('/')
    })
  })

  describe('generateCodeChallenge', () => {
    it('generates a base64url-encoded SHA-256 hash', async () => {
      const verifier = 'test-verifier-123'
      const challenge = await generateCodeChallenge(verifier)
      
      expect(challenge).toBeTruthy()
      expect(typeof challenge).toBe('string')
      expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('generates consistent challenge for same verifier', async () => {
      const verifier = 'same-verifier'
      const challenge1 = await generateCodeChallenge(verifier)
      const challenge2 = await generateCodeChallenge(verifier)
      
      expect(challenge1).toBe(challenge2)
    })

    it('generates different challenges for different verifiers', async () => {
      const challenge1 = await generateCodeChallenge('verifier-1')
      const challenge2 = await generateCodeChallenge('verifier-2')
      
      expect(challenge1).not.toBe(challenge2)
    })

    it('generates challenge with correct length (43 chars for SHA-256)', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      
      // SHA-256 produces 32 bytes, base64url encoded = 43 characters
      expect(challenge.length).toBe(43)
    })

    it('does not contain base64 padding or special chars', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      
      expect(challenge).not.toContain('=')
      expect(challenge).not.toContain('+')
      expect(challenge).not.toContain('/')
    })

    it('works with generated verifiers', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      
      expect(verifier).toBeTruthy()
      expect(challenge).toBeTruthy()
      expect(verifier).not.toBe(challenge)
    })
  })

  describe('PKCE flow integration', () => {
    it('creates valid verifier and challenge pair', async () => {
      const verifier = generateCodeVerifier()
      const challenge = await generateCodeChallenge(verifier)
      
      expect(verifier).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(challenge).toMatch(/^[A-Za-z0-9_-]{43}$/)
      expect(verifier).not.toBe(challenge)
    })
  })
})