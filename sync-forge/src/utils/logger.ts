import axios from "axios"

const Logger = {
  log(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.log(...args)
  },

  error(...args: unknown[]): void {
    // eslint-disable-next-line no-console
    console.error(...args)
  },

  apiError(error: unknown, extras: Record<string, unknown> = {}): void {
    const info = Object.keys(extras).length > 0 ? extras : undefined

    if (axios.isAxiosError(error)) {
      this.log(`An AXIOS error occurred: ${error.message}`, info)
    } else if (error instanceof Error) {
      this.log(`An unexpected error occurred: ${error.message}`, info)
    } else {
      this.log(`An unknown error occurred: ${String(error)}`, info)
    }
  }
}

export default Logger
