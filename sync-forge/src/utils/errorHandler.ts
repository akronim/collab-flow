import { isAxiosError, type AxiosError } from 'axios'

interface ErrorWithMessage {
  message: string;
}

interface AxiosErrorData {
  message?: string;
  error?: string;
  error_description?: string;
}

// eslint-disable-next-line complexity
export const getErrorMessage = (error: unknown, fallback = `An unexpected error occurred`): string => {
  if (isAxiosError(error)) {
    const axiosError = error as AxiosError<AxiosErrorData>
    const data = axiosError.response?.data

    if (data) {
      return data.error_description ?? data.message ?? data.error ?? fallback
    }

    return axiosError.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === `object` && error !== null && `message` in error) {
    return (error as ErrorWithMessage).message
  }

  if (typeof error === `string`) {
    return error
  }

  return fallback
}
