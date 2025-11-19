import { describe, it, expect, vi, beforeEach } from 'vitest'
import Logger from '@/utils/logger'
import * as loader from '@/components/shared/editors/jodit/joditLoader'

vi.mock(import(`@/utils/logger`), async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/utils/logger')>()
  return {
    default: {
      ...actual.default,
      error: vi.fn()
    }
  }
})

vi.mock(import(`ace-builds/src-noconflict/ace`), () => ({}))
vi.mock(import(`ace-builds/src-noconflict/theme-idle_fingers`), () => ({}))
vi.mock(import(`ace-builds/src-noconflict/mode-html`), () => ({}))

vi.mock(`jodit/esm/index`, () => ({
  // eslint-disable-next-line @typescript-eslint/no-extraneous-class
  Jodit: class MockJodit { }
}))

vi.mock(import(`jodit/es2021/jodit.min.css`), () => ({}))
vi.mock(import(`jodit/esm/plugins/all.js`), () => ({}))

describe(`loadAce`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it(`should load Ace editor modules successfully`, async () => {
    await expect(loader.loadAce()).resolves.toBeUndefined()
    expect(Logger.error).not.toHaveBeenCalled()
  })

  it(`should cache the Ace loading promise`, async () => {
    const firstCall = loader.loadAce()
    const secondCall = loader.loadAce()

    expect(firstCall).toStrictEqual(secondCall)

    await firstCall
    await secondCall
  })

  it(`should return cached result on subsequent calls`, async () => {
    let importCallCount = 0

    vi.doMock(`ace-builds/src-noconflict/ace`, () => {
      importCallCount++
      return {}
    })

    const { loadAce } = await import(`@/components/shared/editors/jodit/joditLoader`)

    await loadAce()

    expect(importCallCount).toBe(1)

    await loadAce()

    expect(importCallCount).toBe(1)
  })

  it(`should handle import errors and log them`, async () => {
    const mockError = new Error(`ACE Import failed`)

    vi.spyOn(Promise, `all`).mockRejectedValueOnce(mockError)

    const { loadAce: loadAceWithError } = await import(`@/components/shared/editors/jodit/joditLoader`)

    await expect(loadAceWithError()).rejects.toThrow(`ACE Import failed`)
    expect(Logger.error).toHaveBeenCalledWith(`Failed to load Ace editor:`, mockError)
  })

  it(`should reset cache on error to allow retry`, async () => {
    const mockError = new Error(`ACE Import failed`)

    vi.spyOn(Promise, `all`).mockRejectedValueOnce(mockError)

    const { loadAce: loadAceRetry } = await import(`@/components/shared/editors/jodit/joditLoader`)

    await expect(loadAceRetry()).rejects.toThrow(`ACE Import failed`)

    await expect(loadAceRetry()).resolves.toBeUndefined()
  })
})

describe(`loadJodit`, () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it(`should load Jodit editor and plugins successfully`, async () => {
    const result = await loader.loadJodit()

    expect(result).toHaveProperty(`Jodit`)
    expect(result).toHaveProperty(`pluginsLoaded`, true)
    expect(Logger.error).not.toHaveBeenCalled()
  })

  it(`should cache the Jodit loading promise`, async () => {
    const firstCall = loader.loadJodit()
    const secondCall = loader.loadJodit()

    expect(firstCall).toStrictEqual(secondCall)

    await firstCall
    await secondCall
  })

  it(`should return cached result on subsequent calls`, async () => {
    const firstResult = await loader.loadJodit()
    const secondResult = await loader.loadJodit()

    expect(firstResult).toBe(secondResult)
    expect(firstResult.pluginsLoaded).toBe(true)
  })

  it(`should handle import errors and log them`, async () => {
    const mockError = new Error(`Jodit import failed`)
    vi.spyOn(Promise, `all`).mockRejectedValueOnce(mockError)

    const { loadJodit: loadJoditWithError } = await import(`@/components/shared/editors/jodit/joditLoader`)

    await expect(loadJoditWithError()).rejects.toThrow(`Jodit import failed`)
    expect(Logger.error).toHaveBeenCalledWith(`Failed to load Jodit or plugins:`, mockError)
  })

  it(`should reset cache on error to allow retry`, async () => {
    const mockError = new Error(`Jodit import failed`)
    vi.spyOn(Promise, `all`).mockRejectedValueOnce(mockError)

    const { loadJodit: loadJoditRetry } = await import(`@/components/shared/editors/jodit/joditLoader`)

    await expect(loadJoditRetry()).rejects.toThrow(`Jodit import failed`)

    await expect(loadJoditRetry()).resolves.toHaveProperty(`pluginsLoaded`, true)
  })

  it(`should load all required Jodit dependencies`, async () => {
    const importSpy = vi.fn()

    vi.doMock(`jodit/esm/index`, () => {
      importSpy(`jodit/esm/index`)
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class 
      return { Jodit: class MockJodit { } }
    })
    vi.doMock(`jodit/es2021/jodit.min.css`, () => {
      importSpy(`jodit/es2021/jodit.min.css`)
      return {}
    })
    vi.doMock(`jodit/esm/plugins/all.js`, () => {
      importSpy(`jodit/esm/plugins/all.js`)
      return {}
    })

    vi.resetModules()
    const { loadJodit: loadJoditTracked } = await import(`@/components/shared/editors/jodit/joditLoader`)

    await loadJoditTracked()

    expect(importSpy).toHaveBeenCalledWith(`jodit/esm/index`)
    expect(importSpy).toHaveBeenCalledWith(`jodit/es2021/jodit.min.css`)
    expect(importSpy).toHaveBeenCalledWith(`jodit/esm/plugins/all.js`)
  })
})
