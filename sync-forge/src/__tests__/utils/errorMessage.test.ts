import { describe, it, expect } from 'vitest'
import { AxiosError } from 'axios'
import { getErrorMessage } from '@/utils/errorMessage'
import { NotificationMessages } from '@/constants/notificationMessages'

const TestMessages = {
  INVALID_CREDENTIALS: `Invalid credentials`,
  NOT_FOUND: `Not found`,
  SERVER_ERROR: `server_error`,
  NETWORK_ERROR: `Network Error`,
  REQUEST_FAILED: `Request failed`,
  CUSTOM_ERROR: `Custom error`,
  STRING_ERROR: `String error`,
  CUSTOM_FALLBACK: `Custom fallback`
} as const

describe(`getErrorMessage`, () => {
  describe(`Axios errors`, () => {
    it(`returns error_description from response data`, () => {
      const error = new AxiosError(TestMessages.REQUEST_FAILED)
      error.response = {
        data: { error_description: TestMessages.INVALID_CREDENTIALS },
        status: 401,
        statusText: `Unauthorized`,
        headers: {},
        config: { headers: {} } as never
      }

      expect(getErrorMessage(error)).toBe(TestMessages.INVALID_CREDENTIALS)
    })

    it(`returns message from response data if no error_description`, () => {
      const error = new AxiosError(TestMessages.REQUEST_FAILED)
      error.response = {
        data: { message: TestMessages.NOT_FOUND },
        status: 404,
        statusText: `Not Found`,
        headers: {},
        config: { headers: {} } as never
      }

      expect(getErrorMessage(error)).toBe(TestMessages.NOT_FOUND)
    })

    it(`returns error from response data if no message`, () => {
      const error = new AxiosError(TestMessages.REQUEST_FAILED)
      error.response = {
        data: { error: TestMessages.SERVER_ERROR },
        status: 500,
        statusText: `Internal Server Error`,
        headers: {},
        config: { headers: {} } as never
      }

      expect(getErrorMessage(error)).toBe(TestMessages.SERVER_ERROR)
    })

    it(`returns axios message if no response data`, () => {
      const error = new AxiosError(TestMessages.NETWORK_ERROR)

      expect(getErrorMessage(error)).toBe(TestMessages.NETWORK_ERROR)
    })
  })

  describe(`Other error types`, () => {
    it(`returns message from Error instance`, () => {
      const error = new Error(NotificationMessages.SOMETHING_WENT_WRONG)

      expect(getErrorMessage(error)).toBe(NotificationMessages.SOMETHING_WENT_WRONG)
    })

    it(`returns message from object with message property`, () => {
      const error = { message: TestMessages.CUSTOM_ERROR }

      expect(getErrorMessage(error)).toBe(TestMessages.CUSTOM_ERROR)
    })

    it(`returns string error directly`, () => {
      expect(getErrorMessage(TestMessages.STRING_ERROR)).toBe(TestMessages.STRING_ERROR)
    })

    it(`returns default fallback for unknown types`, () => {
      expect(getErrorMessage(null)).toBe(NotificationMessages.UNEXPECTED_ERROR)
      expect(getErrorMessage(undefined)).toBe(NotificationMessages.UNEXPECTED_ERROR)
      expect(getErrorMessage(123)).toBe(NotificationMessages.UNEXPECTED_ERROR)
    })

    it(`returns custom fallback when provided`, () => {
      expect(getErrorMessage(null, TestMessages.CUSTOM_FALLBACK)).toBe(TestMessages.CUSTOM_FALLBACK)
    })
  })
})
