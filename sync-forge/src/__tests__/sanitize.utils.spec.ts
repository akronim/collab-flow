import { describe, it, expect } from 'vitest'
import { sanitizeInput } from '@/utils/sanitize'

describe('sanitizeInput', () => {
    it('should escape HTML', () => {
        const input = '<script>alert("xss")</script><p>Hello</p>'
        const output = sanitizeInput(input)
        expect(output).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;&lt;p&gt;Hello&lt;/p&gt;')
    })

    it('should allow safe text', () => {
        const input = 'Hello <b>World</b>'
        const output = sanitizeInput(input)
        expect(output).toBe('Hello &lt;b&gt;World&lt;/b&gt;')
    })
})