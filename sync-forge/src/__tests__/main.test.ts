import { describe, it, expect, vi, beforeEach } from 'vitest'

const setRefreshTokenFnMock = vi.fn()

vi.mock('@/utils/api', () => ({
    default: {
        setRefreshTokenFn: setRefreshTokenFnMock
    },
}))

describe.only('main.ts', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        document.body.innerHTML = '<div id="app"></div>'
        vi.resetModules()
    })

    it('initializes the auth store and sets up API refresh token function', async () => {
        await import('@/main')

        expect(setRefreshTokenFnMock).toHaveBeenCalled()
        expect(setRefreshTokenFnMock).toHaveBeenCalledWith(expect.any(Function))
    })
})