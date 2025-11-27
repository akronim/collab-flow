import { describe, it, expect, vi, beforeEach } from 'vitest'
import resourceApi from '@/utils/resourceApi'

vi.mock(`@/utils/resourceApi`, () => ({
  default: {
    setRefreshTokenFn: vi.fn(),
    post: vi.fn(),
    get: vi.fn()
  }
}))

describe(`main.ts`, () => {
  let setRefreshTokenFnSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    document.body.innerHTML = `<div id="app"></div>`
    vi.resetModules()
    setRefreshTokenFnSpy = vi.spyOn(resourceApi, `setRefreshTokenFn`)
  })

  it(`initializes the auth store and sets up API refresh token function`, async () => {
    await import(`@/main`)

    expect(setRefreshTokenFnSpy).toHaveBeenCalled()
    expect(setRefreshTokenFnSpy).toHaveBeenCalledWith(expect.any(Function))
  })
})