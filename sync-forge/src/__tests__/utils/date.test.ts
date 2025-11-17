import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { 
  formatToLocalDayMonthYearTime, 
  isFutureZoned, 
  isoUtcStrToDate, 
  isValidIsoUtcString, 
  toISOStringWithoutMilliseconds, 
  toIsoUtcStr 
} from '@/utils/date'
import { DateTime } from 'luxon'
import { mockTimeZone } from '../mocks'

describe(`isoUtcStrToDate`, () => {

  const sampleIsoUtc = `2025-08-12T15:30:45.496Z`
  const sampleDate = DateTime.fromISO(sampleIsoUtc).toJSDate()

  describe(`toISOStringWithoutMilliseconds`, () => {
    it(`returns ISO string without milliseconds`, () => {
      const result = toISOStringWithoutMilliseconds(sampleDate)

      expect(result).toBe(`2025-08-12T15:30:45Z`)
    })
  })

  describe(`isValidIsoUtcString`, () => {
    it(`returns true for valid ISO UTC string`, () => {
      expect(isValidIsoUtcString(sampleIsoUtc)).toBe(true)
      expect(isValidIsoUtcString(`2025-08-12T15:30:45Z`)).toBe(true)
    })

    it(`returns false for invalid ISO UTC string`, () => {
      expect(isValidIsoUtcString(`2025-08-12 15:30:45`)).toBe(false)
      expect(isValidIsoUtcString(`2024-07-23T12:34:56`)).toBe(false) // missing 'Z'
      expect(isValidIsoUtcString(null)).toBe(false)
    })

    it(`returns false for valid ISO but non-UTC`, () => {
      expect(isValidIsoUtcString(`2025-08-12T15:30:45+02:00`)).toBe(false)
    })
  })

  describe(`isoUtcStrToDate`, () => {
    it(`converts ISO UTC string to Date in given time zone`, () => {
      const result = isoUtcStrToDate(sampleIsoUtc, mockTimeZone)

      expect(result).toBeInstanceOf(Date)
      expect(!!result && DateTime.fromJSDate(result, { zone: mockTimeZone }).hour).toBe(17) // Zagreb is UTC+2 in summer
    })

    it(`returns null for invalid ISO string`, () => {
      expect(isoUtcStrToDate(`not-a-date`, mockTimeZone)).toBeNull()
    })

    it(`returns null for missing time zone`, () => {
      expect(isoUtcStrToDate(sampleIsoUtc, ``)).toBeNull()
    })

    it(`should return null when input is null`, () => {
      const result = isoUtcStrToDate(null, mockTimeZone)

      expect(result).toBeNull()
    })
  })

  describe(`toIsoUtcStr`, () => {
    it(`converts local date to ISO UTC string without milliseconds`, () => {
      const result = toIsoUtcStr(sampleDate, mockTimeZone)

      expect(result).toBe(sampleIsoUtc) // Zagreb time converted back to UTC
    })

    it(`returns null for invalid date`, () => {
      expect(toIsoUtcStr(null, mockTimeZone)).toBeNull()
      expect(toIsoUtcStr(undefined, mockTimeZone)).toBeNull()
    })

    it(`returns null for missing time zone`, () => {
      expect(toIsoUtcStr(sampleDate, ``)).toBeNull()
    })

    it(`should handle single digit months, days, hours, minutes, and seconds`, () => {
      const date = new Date(2023, 0, 5, 4, 3, 2)
      const result = toIsoUtcStr(date, mockTimeZone)

      expect(result).toBe(`2023-01-05T03:03:02Z`)
    })
  })

  describe(`formatToLocalDayMonthYearTime`, () => {
    it(`formats ISO UTC string with long year and time`, () => {
      const result = formatToLocalDayMonthYearTime(sampleIsoUtc, mockTimeZone, false, true)

      expect(result).toBe(`12.08.2025 17:30`) // Local time in Zagreb
    })

    it(`formats Date object with long year and time`, () => {
      const result = formatToLocalDayMonthYearTime(sampleDate, mockTimeZone, false, true)

      expect(result).toBe(`12.08.2025 17:30`) 
    })

    it(`formats ISO UTC string with short year and time`, () => {
      const result = formatToLocalDayMonthYearTime(sampleIsoUtc, mockTimeZone, true, true)

      expect(result).toBe(`12.08.25 17:30`)
    })

    it(`formats Date object with short year and time`, () => {
      const result = formatToLocalDayMonthYearTime(sampleDate, mockTimeZone, true, true)

      expect(result).toBe(`12.08.25 17:30`)
    })

    it(`formats ISO UTC string with long year without time`, () => {
      const result = formatToLocalDayMonthYearTime(sampleIsoUtc, mockTimeZone, false, false)

      expect(result).toBe(`12.08.2025`)
    })

    it(`formats Date object with long year without time`, () => {
      const result = formatToLocalDayMonthYearTime(sampleDate, mockTimeZone, false, false)

      expect(result).toBe(`12.08.2025`)
    })

    it(`returns null for invalid date`, () => {
      expect(formatToLocalDayMonthYearTime(`invalid`, mockTimeZone)).toBeNull()
      expect(formatToLocalDayMonthYearTime(null, mockTimeZone)).toBeNull()
      expect(formatToLocalDayMonthYearTime(``, mockTimeZone)).toBeNull()
      expect(formatToLocalDayMonthYearTime(`2024-07-23T12:34:56`, mockTimeZone)).toBeNull() // missing 'Z'
    })
  })

  describe(`isFutureZoned`, () => {
    beforeEach(() => {
      vi.useFakeTimers()

      const date = new Date(`2020-10-15T14:00:00Z`)
      vi.setSystemTime(date)
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it(`should return true if the given ISO UTC string is in the future`, () => {
      const isoFutureDate = `2020-10-15T15:00:00Z` // 1 hour in the future

      expect(isFutureZoned(isoFutureDate, mockTimeZone)).toBe(true)
    })

    it(`should return false if the given ISO UTC string is in the past`, () => {
      const isoPastDate = `2020-10-15T13:00:00Z` // 1 hour in the past

      expect(isFutureZoned(isoPastDate, mockTimeZone)).toBe(false)
    })

    it(`should return true if the given Date object is in the future`, () => {
      const futureTime = new Date(Date.now() + 1000) // 1 second in the future

      expect(isFutureZoned(futureTime, mockTimeZone)).toBe(true)
    })

    it(`should return false if the given Date object is in the past`, () => {
      const pastTime = new Date(Date.now() - 1000) // 1 second in the past

      expect(isFutureZoned(pastTime, mockTimeZone)).toBe(false)
    })

    it(`should return false if the given ISO UTC string is the current time`, () => {
      const isoCurrentDate = new Date(`2020-10-15T14:00:00Z`)

      expect(isFutureZoned(isoCurrentDate, mockTimeZone)).toBe(false)
    })

    it(`should return false if the given Date object is the current time`, () => {
      const currentDate = new Date()

      expect(isFutureZoned(currentDate, mockTimeZone)).toBe(false)
    })

    it(`should return false for invalid ISO date strings`, () => {
      expect(isFutureZoned(`invalid-date`, mockTimeZone)).toBe(false)
      expect(isFutureZoned(`2024-07-23T12:34:56`, mockTimeZone)).toBe(false) // Missing 'Z'
    })
  })
})


