import axios from 'axios'

// TODO replace with Winston or Pino
const Logger = {
  log(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(...args)
  },

  warn(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.warn(...args)
  },

  error(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(...args)
  },

  apiError(error: unknown, extras: Record<string, unknown> = {}): void {
    const info = Object.keys(extras).length > 0 ? extras : undefined

    if (axios.isAxiosError(error)) {
      this.error(`An AXIOS error occurred: ${error.message}`, info)
    } else if (error instanceof Error) {
      this.error(`An unexpected error occurred: ${error.message}`, info)
    } else {
      this.error(`An unknown error occurred: ${String(error)}`, info)
    }
  }
}

export default Logger
