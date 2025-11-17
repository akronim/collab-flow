import { ISO_UTC_REGEX } from '@/constants/shared'
import { DateTime } from 'luxon'

export const toISOStringWithoutMilliseconds = (date: Date): string | null => {
  return DateTime.fromJSDate(date)
    .toUTC()
    .set({ millisecond: 0 }) 
    .toISO({ suppressMilliseconds: true })
}

export const isValidIsoUtcString = (isoUtcStr: string | null): boolean => {
  return !!isoUtcStr &&
    ISO_UTC_REGEX.test(isoUtcStr) &&
    DateTime.fromISO(isoUtcStr, { zone: `utc` }).isValid
}

export const isoUtcStrToDate = (isoUtcStr: string | null, timeZone: string): Date | null => {
  if (!isoUtcStr || !timeZone || !isValidIsoUtcString(isoUtcStr)) {
    return null
  }
  return DateTime.fromISO(isoUtcStr, { zone: `utc` }).setZone(timeZone).toJSDate()
}

export const toIsoUtcStr = (date: Date | null | undefined, timeZone: string): string | null => {
  if (!date || !timeZone) {
    return null
  }
  return DateTime.fromJSDate(date, { zone: timeZone }).toUTC().toISO({ suppressMilliseconds: true })
}

export const formatToLocalDayMonthYearTime = (
  date: string | Date | null | undefined,
  timeZone: string,
  yearShort = false,
  showTime = true
): string | null => {
  if (!date || !timeZone || (typeof date === `string` && !isValidIsoUtcString(date))) {
    return null
  }

  const dt = typeof date === `string` 
    ? DateTime.fromISO(date, { zone: `utc` }).setZone(timeZone)
    : DateTime.fromJSDate(date, { zone: timeZone }).toUTC().setZone(timeZone)

  const dateFormat = yearShort ? `dd.MM.yy` : `dd.MM.yyyy`
  const timeFormat = ` HH:mm`
  const formatString = showTime ? dateFormat + timeFormat : dateFormat

  return dt.toFormat(formatString)
}


export const isFutureZoned = (date: string | Date, timeZone: string): boolean => {
  let dt: DateTime

  if (typeof date === `string`) {
    if (!isValidIsoUtcString(date)) {
      return false
    }
    dt = DateTime.fromISO(date, { zone: `utc` }).setZone(timeZone)
  } else {
    dt = DateTime.fromJSDate(date, { zone: timeZone })
  }

  return dt > DateTime.now().setZone(timeZone)
}

