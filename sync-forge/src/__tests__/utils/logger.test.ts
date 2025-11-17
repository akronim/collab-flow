import Logger from "@/utils/logger"
import { afterEach, describe, expect, it, vi } from "vitest"
import { AxiosError } from "axios"

describe(`Logger`, () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe(`log`, () => {
    it(`calls console.log with provided arguments`, () => {
      const consoleSpy = vi.spyOn(console, `log`)
      Logger.log(`test`, `message`, 123)
      
      expect(consoleSpy).toHaveBeenCalledWith(`test`, `message`, 123)
    })
  })

  describe(`error`, () => {
    it(`calls console.error with provided arguments`, () => {
      const consoleSpy = vi.spyOn(console, `error`)
      Logger.error(`error`, `message`, { code: 500 })
      
      expect(consoleSpy).toHaveBeenCalledWith(`error`, `message`, { code: 500 })
    })
  })

  describe(`apiError`, () => {
    it(`logs Axios error message with info when provided`, () => {
      const mockError = new AxiosError(`Network Error`, `ERR_NETWORK`)
      const mockInfo = { url: `/some/api`, method: `GET` }
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(mockError, mockInfo)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An AXIOS error occurred: ${mockError.message}`, 
        mockInfo
      )
    })

    it(`logs Axios error message without info when not provided`, () => {
      const mockError = new AxiosError(`Network Error`, `ERR_NETWORK`)
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(mockError)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An AXIOS error occurred: ${mockError.message}`, 
        undefined
      )
    })

    it(`logs unexpected error message with info when provided`, () => {
      const mockError = new Error(`Unknown error`)
      const mockInfo = { foo: `bar` }
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(mockError, mockInfo)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An unexpected error occurred: ${mockError.message}`, 
        mockInfo
      )
    })

    it(`logs unexpected error message without info when not provided`, () => {
      const mockError = new Error(`Unknown error`)
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(mockError)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An unexpected error occurred: ${mockError.message}`, 
        undefined
      )
    })

    it(`logs unknown error type with info when provided`, () => {
      const mockError = `Some unknown error`
      const mockInfo = { foo: `bar` }
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(mockError, mockInfo)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An unknown error occurred: Some unknown error`, 
        mockInfo
      )
    })

    it(`logs unknown error type without info when not provided`, () => {
      const mockError = `Some unknown error`
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(mockError)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An unknown error occurred: Some unknown error`, 
        undefined
      )
    })

    it(`handles null error`, () => {
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(null)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An unknown error occurred: null`, 
        undefined
      )
    })

    it(`handles undefined error`, () => {
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(undefined)

      expect(consoleSpy).toHaveBeenCalledWith(
        `An unknown error occurred: undefined`, 
        undefined
      )
    })

    it(`handles numeric error`, () => {
      const consoleSpy = vi.spyOn(console, `log`)

      Logger.apiError(404, { context: `not found` })

      expect(consoleSpy).toHaveBeenCalledWith(
        `An unknown error occurred: 404`, 
        { context: `not found` }
      )
    })
  })
})
