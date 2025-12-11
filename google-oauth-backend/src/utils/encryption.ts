import crypto from 'crypto'

const ALGORITHM = `aes-256-gcm`
const IV_LENGTH = 16

export const encrypt = (plaintext: string, key: string): string => {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(key, `hex`), iv)

  let encrypted = cipher.update(plaintext, `utf8`, `hex`)
  encrypted += cipher.final(`hex`)

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:encrypted
  return `${iv.toString(`hex`)}:${authTag.toString(`hex`)}:${encrypted}`
}

export const decrypt = (ciphertext: string, key: string): string => {
  const [ivHex, authTagHex, encrypted] = ciphertext.split(`:`)

  const iv = Buffer.from(ivHex, `hex`)
  const authTag = Buffer.from(authTagHex, `hex`)
  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(key, `hex`), iv)

  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, `hex`, `utf8`)
  decrypted += decipher.final(`utf8`)

  return decrypted
}
