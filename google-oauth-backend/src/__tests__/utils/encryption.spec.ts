import { describe, it, expect } from 'vitest'
import { encrypt, decrypt } from '../../utils/encryption'
import crypto from 'crypto'

describe(`Encryption Utility`, () => {
  const key = crypto.randomBytes(32).toString(`hex`)
  const plaintext = `my-super-secret-google-refresh-token`

  it(`should encrypt and decrypt a string successfully`, () => {
    const ciphertext = encrypt(plaintext, key)
    const decryptedText = decrypt(ciphertext, key)

    expect(ciphertext).not.toEqual(plaintext)
    expect(decryptedText).toEqual(plaintext)
  })

  it(`should not be able to decrypt with a wrong key`, () => {
    const wrongKey = crypto.randomBytes(32).toString(`hex`)
    const ciphertext = encrypt(plaintext, key)

    // Expect the decrypt function to throw an error
    expect(() => decrypt(ciphertext, wrongKey)).toThrow()
  })

  it(`should produce a different ciphertext for the same plaintext on each encryption`, () => {
    const ciphertext1 = encrypt(plaintext, key)
    const ciphertext2 = encrypt(plaintext, key)

    expect(ciphertext1).not.toEqual(ciphertext2)
  })
})
