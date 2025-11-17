import Logger from '@/utils/logger'
import type { Jodit as JoditType } from 'jodit/esm/jodit'

interface JoditModule {
  Jodit: typeof JoditType;
  pluginsLoaded: boolean;
}

let joditCache: Promise<JoditModule> | null = null
let aceCache: Promise<void> | null = null

export const loadAceModules = async (): Promise<void> => {
  await Promise.all([
    import(`ace-builds/src-noconflict/ace`),
    import(`ace-builds/src-noconflict/theme-idle_fingers`),
    import(`ace-builds/src-noconflict/mode-html`)
  ])
}

export const loadJoditModules = async (): Promise<JoditModule> => {
  const [{ Jodit }, ,] = await Promise.all([
    import(`jodit/esm/index`),
    import(`jodit/es2021/jodit.min.css`),
    import(`jodit/esm/plugins/all.js`)
  ])
  return { Jodit, pluginsLoaded: true }
}

export const loadAce = async (): Promise<void> => {
  if (aceCache) {
    return aceCache
  }
  aceCache = (async (): Promise<void> => {
    try {
      await loadAceModules()
    } catch (error) {
      Logger.error(`Failed to load Ace editor:`, error)
      aceCache = null
      throw error
    }
  })()
  return aceCache
}

export const loadJodit = async (): Promise<JoditModule> => {
  if (joditCache) {
    return joditCache
  }
  joditCache = (async (): Promise<JoditModule> => {
    try {
      return await loadJoditModules()
    } catch (error) {
      Logger.error(`Failed to load Jodit or plugins:`, error)
      joditCache = null
      throw error
    }
  })()
  return joditCache
}
