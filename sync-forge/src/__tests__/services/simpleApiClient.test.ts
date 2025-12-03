import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createSimpleApiClient } from '@/services/simpleApiClient'
import axios from 'axios'

vi.mock(`axios`, () => ({
  default: {
    create: vi.fn().mockImplementation(() => ({}))
  }
}))

const MOCK_URL = `http://mock-auth.url`
const mockedAxiosCreate = vi.mocked(axios.create)

describe(`authApiClient`, () => {
  beforeEach(() => {
    mockedAxiosCreate.mockClear()
    vi.resetModules() 
  })

  describe(`createSimpleApiClient factory`, () => {
    it(`should create an axios instance with the correct config`, () => {
      createSimpleApiClient(MOCK_URL)

      expect(mockedAxiosCreate).toHaveBeenCalledWith({
        baseURL: MOCK_URL,
        timeout: 10000,
        withCredentials: true
      })
      expect(mockedAxiosCreate).toHaveBeenCalledTimes(1)
    })

    it(`should throw an error if no baseURL is provided`, () => {
      // @ts-expect-error: Intentionally passing an invalid type to test runtime validation.
      expect(() => createSimpleApiClient(undefined)).toThrow(`Cannot create API client without a baseURL`)
    })
  })

  describe(`simpleApiClient singleton instance`, () => {
    it(`should be an object`, async () => {
      const { simpleApiClient } = await import(`@/services/simpleApiClient`)

      expect(simpleApiClient).toBeDefined()
      expect(typeof simpleApiClient).toBe(`object`)
    })

    it(`should be created by the factory exactly once`, async () => {
      // Dynamically import the module to test its initialization side-effects
      const { simpleApiClient } = await import(`@/services/simpleApiClient`)
      
      expect(simpleApiClient).toBeDefined()

      expect(mockedAxiosCreate).toHaveBeenCalledTimes(1)

      const authApiUrl = import.meta.env.VITE_AUTH_API_URL

      expect(mockedAxiosCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: authApiUrl
        })
      )
    })
  })
})
