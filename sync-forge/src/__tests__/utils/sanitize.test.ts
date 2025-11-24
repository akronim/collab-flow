import { describe, it, expect } from 'vitest'
import { sanitizeHtml, sanitizeInput } from '@/utils/sanitize'

describe(`sanitize`, () => {
  describe(`sanitizeInput`, () => {
    it(`should escape HTML tags`, () => {
      const input = `<script>alert("xss")</script>`
      const expected = `&lt;script&gt;alert("xss")&lt;/script&gt;`

      expect(sanitizeInput(input)).toBe(expected)
    })
  })

  describe(`sanitizeHtml`, () => {
    it(`should remove script tags`, () => {
      const input = `<script>alert("xss")</script><p>hello</p>`
      const expected = `<p>hello</p>`

      expect(sanitizeHtml(input)).toBe(expected)
    })

    it(`should remove onclick handlers`, () => {
      const input = `<a onclick="alert('xss')">click me</a>`
      const expected = `<a>click me</a>`

      expect(sanitizeHtml(input)).toBe(expected)
    })

    it(`should allow safe tags like p and b`, () => {
      const input = `<p><b>bold</b></p>`
      const expected = `<p><b>bold</b></p>`

      expect(sanitizeHtml(input)).toBe(expected)
    })
  })
})
