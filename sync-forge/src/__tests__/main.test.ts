import { describe, it, expect, vi, beforeEach } from 'vitest'

const setRefreshTokenFnMock = vi.fn()
const setGetTokenFnMock = vi.fn()

vi.mock(`@/services/authApiClient`, () => ({
  authApiClient: {
    setRefreshTokenFn: setRefreshTokenFnMock,
    setGetTokenFn: setGetTokenFnMock
  }
}))

// Mock simpleApiClient to prevent real HTTP calls during router navigation
vi.mock(`@/services/simpleApiClient`, () => ({
  simpleApiClient: {
    post: vi.fn().mockRejectedValue(new Error(`no session`)),
    get: vi.fn()
  }
}))

describe(`main.ts`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = `<div id="app"></div>`
    vi.resetModules()
  })

  it(`initializes the auth store and sets up API refresh token function`, async () => {
    await import(`@/main`)

    expect(setRefreshTokenFnMock).toHaveBeenCalled()
    expect(setRefreshTokenFnMock).toHaveBeenCalledWith(expect.any(Function))
    expect(setGetTokenFnMock).toHaveBeenCalled()
    expect(setGetTokenFnMock).toHaveBeenCalledWith(expect.any(Function))
  })
})
