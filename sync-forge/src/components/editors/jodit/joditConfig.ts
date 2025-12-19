import type { Config } from 'jodit/esm/config'
import type { DeepPartial } from 'jodit/esm/types'

export const basicJoditConfig: DeepPartial<Config> = {
  disablePlugins: [`mobile`],
  buttons: [
    `bold`, `italic`, `underline`, `|`, `ul`, `ol`, `link`, `image`, `table`, `source`, `fullsize`, `serverImage`
  ],
  className: `prose`
}
