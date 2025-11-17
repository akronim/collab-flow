import type { AxiosError } from "axios"

type StatusCodeType = number | null | undefined
type DataType<T> = T | null

class ApiCallResult<T = unknown> {
  success: boolean
  data: DataType<T>
  error: unknown
  statusCode: StatusCodeType
  extras: string

  private constructor (success: boolean, data: DataType<T>, error: unknown, status: StatusCodeType, extras: string) {
    this.success = success
    this.data = data
    this.error = error
    this.statusCode = status
    this.extras = extras
  }

  static Success<T>(data: DataType<T> = null, status: StatusCodeType = null, extras = ``): ApiCallResult<T> {
    return new ApiCallResult<T>(true, data, null, status, extras)
  }

  static SuccessVoid (statusCode: StatusCodeType = null, extras = ``): ApiCallResult<void> {
    return new ApiCallResult<void>(true, null, null, statusCode, extras)
  }

  static Fail<T>(error: unknown, extras = ``): ApiCallResult<T> {
    const statusCode = (error as AxiosError)?.response?.status ?? 500
    return new ApiCallResult<T>(false, null, error, statusCode, extras)
  }

  isSuccess (): this is ApiCallResult<T> & { success: true; data: T } {
    return this.success
  }
}

export default ApiCallResult
